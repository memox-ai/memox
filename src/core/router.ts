import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import sqlite3 from 'sqlite3';
import { 
  IMemoryAdapter, 
  MemoryPayload, 
  MemorySearchResult, 
  MemoxConfig 
} from './types';
import { PolicyEngine } from './policies';
import { PostgresAdapter } from '../adapters/postgres';
import { RedisAdapter } from '../adapters/redis';
import { Mem0Adapter } from '../adapters/mem0';
import { ZepAdapter } from '../adapters/zep';

export class MemoryRouter {
  private config!: MemoxConfig;
  private policyEngine!: PolicyEngine;
  private adapters: Map<string, IMemoryAdapter> = new Map();
  private db!: sqlite3.Database;

  constructor(customConfig?: MemoxConfig) {
    this.loadConfig(customConfig);
    this.initSQLite();
    this.initAdapters();
  }

  /**
   * Load configuration from config.yaml or fallback to defaults
   */
  private loadConfig(customConfig?: MemoxConfig) {
    if (customConfig) {
      this.config = customConfig;
      this.policyEngine = new PolicyEngine(this.config.policies);
      return;
    }

    const localConfigPath = path.join(process.cwd(), '.memox', 'config.yaml');
    const globalConfigPath = path.join(os.homedir(), '.memox', 'config.yaml');
    let configPath = globalConfigPath;
    let loadedConfig: any = {};

    try {
      if (fs.existsSync(localConfigPath)) {
        configPath = localConfigPath;
        console.log(`[memox] Loading local configuration from: ${localConfigPath}`);
      } else if (fs.existsSync(globalConfigPath)) {
        configPath = globalConfigPath;
      }

      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        loadedConfig = yaml.parse(fileContent);
      }
    } catch (err) {
      console.warn(`[memox] Warning: Failed to read config from ${configPath}. Using defaults.`, err);
    }

    // Apply defaults if fields are missing
    this.config = {
      router: {
        primaryProvider: loadedConfig.router?.primaryProvider || 'postgres',
        fallbackProvider: loadedConfig.router?.fallbackProvider,
        enableAuditLogs: loadedConfig.router?.enableAuditLogs ?? true
      },
      policies: {
        piiScrubbing: {
          enabled: loadedConfig.policies?.piiScrubbing?.enabled ?? true,
          patterns: loadedConfig.policies?.piiScrubbing?.patterns
        },
        ttl: {
          defaultTtlSeconds: loadedConfig.policies?.ttl?.defaultTtlSeconds,
          enforceTtl: loadedConfig.policies?.ttl?.enforceTtl ?? true
        }
      },
      databases: {
        postgres: loadedConfig.databases?.postgres,
        redis: loadedConfig.databases?.redis,
        sqlite: loadedConfig.databases?.sqlite
      },
      external: {
        mem0: loadedConfig.external?.mem0,
        zep: loadedConfig.external?.zep
      }
    };

    this.policyEngine = new PolicyEngine(this.config.policies);
  }

  /**
   * Initialize local SQLite for logging/history
   */
  private initSQLite() {
    const localDbPath = path.join(process.cwd(), '.memox', 'history.db');
    const globalDbPath = path.join(os.homedir(), '.memox', 'history.db');
    
    const localConfigPath = path.join(process.cwd(), '.memox', 'config.yaml');
    const defaultDbPath = fs.existsSync(localConfigPath) ? localDbPath : globalDbPath;
    const dbPath = this.config.databases?.sqlite?.path || defaultDbPath;

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`[memox] Failed to open local SQLite history database: ${dbPath}`, err);
      }
    });

    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS routing_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          action TEXT,
          session_id TEXT,
          provider TEXT,
          payload_size INTEGER,
          latency_ms INTEGER,
          success INTEGER,
          error_message TEXT
        )
      `);
    });
  }

  /**
   * Initialize active adapters
   */
  private initAdapters() {
    const pgConfig = this.config.databases?.postgres;
    const redisConfig = this.config.databases?.redis;
    const mem0Config = this.config.external?.mem0;
    const zepConfig = this.config.external?.zep;

    this.adapters.set('postgres', new PostgresAdapter(pgConfig));
    this.adapters.set('redis', new RedisAdapter(redisConfig));
    this.adapters.set('mem0', new Mem0Adapter(mem0Config));
    this.adapters.set('zep', new ZepAdapter(zepConfig));
  }

  /**
   * Writes memory payload using configured primary / fallback adapters after applying policies
   */
  public async write(payload: MemoryPayload): Promise<void> {
    const startTime = Date.now();
    const primary = this.config.router.primaryProvider;
    const fallback = this.config.router.fallbackProvider;
    
    // Apply policy engine middleware
    const processedPayload = this.policyEngine.process(payload);
    
    let activeProvider = primary;
    let success = false;
    let errorMessage = '';

    try {
      const adapter = this.adapters.get(primary);
      if (!adapter) {
        throw new Error(`Primary memory provider adapter '${primary}' not found`);
      }
      await adapter.write(processedPayload);
      success = true;
    } catch (err: any) {
      console.error(`[memox] Primary provider '${primary}' write failed.`, err.message || err);
      
      if (fallback) {
        console.info(`[memox] Attempting fallback provider '${fallback}'...`);
        activeProvider = fallback;
        try {
          const fallbackAdapter = this.adapters.get(fallback);
          if (!fallbackAdapter) {
            throw new Error(`Fallback memory provider adapter '${fallback}' not found`);
          }
          await fallbackAdapter.write(processedPayload);
          success = true;
        } catch (fallErr: any) {
          errorMessage = `Primary and fallback both failed. Fallback error: ${fallErr.message || fallErr}`;
          console.error(`[memox] Fallback provider '${fallback}' write failed.`, fallErr.message || fallErr);
        }
      } else {
        errorMessage = err.message || String(err);
      }
    }

    const latency = Date.now() - startTime;
    this.logMetrics('write', processedPayload.sessionId, activeProvider, processedPayload.content.length, latency, success, errorMessage);
    
    if (!success) {
      throw new Error(`Memory write failed: ${errorMessage}`);
    }
  }

  /**
   * Loads memory query from configured primary / fallback adapters
   */
  public async load(sessionId: string, query: string, limit?: number): Promise<MemorySearchResult[]> {
    const startTime = Date.now();
    const primary = this.config.router.primaryProvider;
    const fallback = this.config.router.fallbackProvider;
    
    let activeProvider = primary;
    let results: MemorySearchResult[] = [];
    let success = false;
    let errorMessage = '';

    try {
      const adapter = this.adapters.get(primary);
      if (!adapter) {
        throw new Error(`Primary memory provider adapter '${primary}' not found`);
      }
      results = await adapter.load(sessionId, query, limit);
      success = true;
    } catch (err: any) {
      console.error(`[memox] Primary provider '${primary}' load failed.`, err.message || err);
      
      if (fallback) {
        console.info(`[memox] Attempting fallback provider '${fallback}'...`);
        activeProvider = fallback;
        try {
          const fallbackAdapter = this.adapters.get(fallback);
          if (!fallbackAdapter) {
            throw new Error(`Fallback memory provider adapter '${fallback}' not found`);
          }
          results = await fallbackAdapter.load(sessionId, query, limit);
          success = true;
        } catch (fallErr: any) {
          errorMessage = `Primary and fallback both failed. Fallback error: ${fallErr.message || fallErr}`;
          console.error(`[memox] Fallback provider '${fallback}' load failed.`, fallErr.message || fallErr);
        }
      } else {
        errorMessage = err.message || String(err);
      }
    }

    const latency = Date.now() - startTime;
    this.logMetrics('load', sessionId, activeProvider, query.length, latency, success, errorMessage);

    if (!success) {
      throw new Error(`Memory load failed: ${errorMessage}`);
    }

    return results;
  }

  /**
   * Logs execution metrics to stdout and SQLite
   */
  private logMetrics(
    action: 'write' | 'load',
    sessionId: string,
    provider: string,
    payloadSize: number,
    latencyMs: number,
    success: boolean,
    errorMessage: string
  ) {
    if (this.config.router.enableAuditLogs) {
      const statusColor = success ? '\x1b[32mSUCCESS\x1b[0m' : '\x1b[31mFAILED\x1b[0m';
      console.log(
        `\x1b[36m[memox AUDIT]\x1b[0m ${action.toUpperCase()} | Session: ${sessionId} | Provider: ${provider} | Latency: ${latencyMs}ms | Status: ${statusColor}` +
        (errorMessage ? ` | Error: ${errorMessage}` : '')
      );
    }

    // Write to SQLite routing_history
    const query = `
      INSERT INTO routing_history (action, session_id, provider, payload_size, latency_ms, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    this.db.run(
      query,
      [action, sessionId, provider, payloadSize, latencyMs, success ? 1 : 0, errorMessage || null],
      (err) => {
        if (err) {
          console.error('[memox] Failed to write routing metrics to history database', err);
        }
      }
    );
  }

  /**
   * Execute custom read queries on the history database (for dashboard metrics)
   */
  public queryHistory(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Expose config with secrets masked for the dashboard
   */
  public getMaskedConfig(): MemoxConfig {
    const mask = (str?: string) => (str ? '********' : '');
    return {
      router: this.config.router,
      policies: this.config.policies,
      databases: {
        postgres: {
          connectionString: mask(this.config.databases?.postgres?.connectionString),
          tableName: this.config.databases?.postgres?.tableName,
          vectorDimension: this.config.databases?.postgres?.vectorDimension
        },
        redis: {
          url: mask(this.config.databases?.redis?.url),
          indexName: this.config.databases?.redis?.indexName,
          vectorDimension: this.config.databases?.redis?.vectorDimension
        },
        sqlite: this.config.databases?.sqlite
      },
      external: {
        mem0: {
          apiKey: mask(this.config.external?.mem0?.apiKey)
        },
        zep: {
          apiKey: mask(this.config.external?.zep?.apiKey),
          apiUrl: this.config.external?.zep?.apiUrl
        }
      }
    };
  }

  /**
   * Return adapter connection status
   */
  public getAdapterStatuses(): Record<string, boolean> {
    const statuses: Record<string, boolean> = {};
    for (const [name, adapter] of this.adapters.entries()) {
      statuses[name] = !(adapter as any).isMockMode;
    }
    return statuses;
  }

  /**
   * Close the SQLite connection properly
   */
  public close() {
    if (this.db) {
      this.db.close();
    }
  }
}
