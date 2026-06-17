import express, { Request, Response } from 'express';
import cors from 'cors';
import { MemoryRouter } from '../core/router';

export class RESTServer {
  private app: express.Application;
  private router: MemoryRouter;
  private port: number;
  private serverInstance: any = null;

  constructor(port = 16369) {
    this.port = port;
    this.app = express();
    this.router = new MemoryRouter();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes() {
    // Health Check Endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'OK', service: 'memox' });
    });

    // Write Memory Endpoint
    this.app.post('/v1/memory/write', async (req: Request, res: Response) => {
      try {
        const { sessionId, content, metadata, ttl_seconds } = req.body;
        
        if (!sessionId || typeof sessionId !== 'string') {
          res.status(400).json({ error: "Missing or invalid 'sessionId' in body" });
          return;
        }
        if (!content || typeof content !== 'string') {
          res.status(400).json({ error: "Missing or invalid 'content' in body" });
          return;
        }

        await this.router.write({
          sessionId,
          content,
          metadata,
          ttl_seconds
        });

        res.status(200).json({ success: true, message: 'Memory routed successfully' });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
      }
    });

    // Load Memory Endpoint
    this.app.post('/v1/memory/load', async (req: Request, res: Response) => {
      try {
        const { sessionId, query, limit } = req.body;

        if (!sessionId || typeof sessionId !== 'string') {
          res.status(400).json({ error: "Missing or invalid 'sessionId' in body" });
          return;
        }
        if (query === undefined || typeof query !== 'string') {
          res.status(400).json({ error: "Missing or invalid 'query' in body" });
          return;
        }

        const results = await this.router.load(sessionId, query, limit);
        res.status(200).json({ success: true, memories: results });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
      }
    });

    // Dashboard Stats Endpoint
    this.app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
      try {
        const statsQuery = `
          SELECT 
            COUNT(CASE WHEN action = 'write' THEN 1 END) as totalWrites,
            COUNT(CASE WHEN action = 'load' THEN 1 END) as totalLoads,
            COUNT(DISTINCT session_id) as totalSessions,
            AVG(latency_ms) as avgLatency,
            AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100 as successRate,
            SUM(CASE WHEN action = 'write' THEN payload_size ELSE 0 END) as totalPayloadSize
          FROM routing_history
        `;
        const providerQuery = `
          SELECT provider, COUNT(*) as count 
          FROM routing_history 
          GROUP BY provider
        `;

        const statsResult = await this.router.queryHistory(statsQuery);
        const providerResult = await this.router.queryHistory(providerQuery);

        const stats = statsResult[0] || {};
        const activeStatuses = this.router.getAdapterStatuses();

        res.json({
          totalWrites: stats.totalWrites || 0,
          totalLoads: stats.totalLoads || 0,
          totalSessions: stats.totalSessions || 0,
          avgLatency: parseFloat((stats.avgLatency || 0).toFixed(2)),
          successRate: parseFloat((stats.successRate || 0).toFixed(2)),
          tokenCount: Math.ceil((stats.totalPayloadSize || 0) / 4),
          providersUsage: providerResult,
          providerStatuses: activeStatuses
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    });

    // Dashboard History Logs Endpoint
    this.app.get('/api/dashboard/history', async (req: Request, res: Response) => {
      try {
        const history = await this.router.queryHistory(`
          SELECT id, timestamp, action, session_id, provider, payload_size, latency_ms, success, error_message
          FROM routing_history
          ORDER BY timestamp DESC
          LIMIT 100
        `);
        res.json(history);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    });

    // Dashboard Sessions Endpoint
    this.app.get('/api/dashboard/sessions', async (req: Request, res: Response) => {
      try {
        const sessions = await this.router.queryHistory(`
          SELECT 
            session_id as sessionId, 
            COUNT(CASE WHEN action = 'write' THEN 1 END) as memoryCount,
            MAX(timestamp) as lastActive
          FROM routing_history
          GROUP BY session_id
          ORDER BY lastActive DESC
        `);
        res.json(sessions);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    });

    // Dashboard Config Endpoint (GET)
    this.app.get('/api/dashboard/config', (req: Request, res: Response) => {
      try {
        const masked = this.router.getMaskedConfig();
        res.json(masked);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    });

    // Dashboard Config Update (POST)
    this.app.post('/api/dashboard/config', (req: Request, res: Response) => {
      try {
        const newConfig = req.body;
        const fs = require('fs');
        const os = require('os');
        const yaml = require('yaml');
        
        const localConfigPath = path.join(process.cwd(), '.memox', 'config.yaml');
        const globalConfigPath = path.join(os.homedir(), '.memox', 'config.yaml');
        const configPath = fs.existsSync(localConfigPath) ? localConfigPath : globalConfigPath;

        let current: any = {};
        if (fs.existsSync(configPath)) {
          const fileContent = fs.readFileSync(configPath, 'utf8');
          current = yaml.parse(fileContent) || {};
        }

        // Deep merge config objects
        const merged = {
          router: { ...(current.router || {}), ...(newConfig.router || {}) },
          policies: { ...(current.policies || {}), ...(newConfig.policies || {}) },
          databases: { ...(current.databases || {}), ...(newConfig.databases || {}) },
          external: { ...(current.external || {}), ...(newConfig.external || {}) }
        };

        fs.writeFileSync(configPath, yaml.stringify(merged), 'utf8');
        
        // Reload Router instance dynamically
        this.router.close();
        this.router = new MemoryRouter();

        res.json({ success: true, message: 'Configuration saved and router reloaded successfully!' });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
      }
    });

    // Serve Static Dashboard Frontend
    const path = require('path');
    const dashboardPath = path.join(__dirname, '../../dashboard/dist');
    this.app.use('/', express.static(dashboardPath));
    
    // Fallback for client-side routing
    this.app.get('*', (req: Request, res: Response) => {
      // Exclude API paths from index.html fallback
      if (req.path.startsWith('/v1/') || req.path.startsWith('/api/') || req.path === '/health') {
        res.status(404).json({ error: 'Not Found' });
        return;
      }
      res.sendFile(path.join(dashboardPath, 'index.html'));
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serverInstance = this.app.listen(this.port, () => {
        const purple = '\x1b[35m';
        const cyan = '\x1b[36m';
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';
        
        console.log(
          purple + "    .---.      _ __ ___   ___ _ __ ___   _____  __\n" +
          purple + "   /  _  \\    | '_ ` _ \\ / _ \\ '_ ` _ \\ / _ \\ \\/ /\n" +
          cyan   + "  |  / \\  |   | | | | | |  __/ | | | | | (_) >  < \n" +
          cyan   + "  |_/   \\_|   |_| |_| |_|\\___|_| |_| |_|\\___/_/\\_\\\n" + reset
        );
        console.log(`${bold}[memox]${reset} REST API server listening at ${cyan}http://localhost:${this.port}${reset}\n`);
        resolve();
      });

      this.serverInstance.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`\n\x1b[31m[memox] Error: Port ${this.port} is already in use.\x1b[0m`);
          console.error(`  Please make sure another instance of memox is not already running.`);
          console.error(`  You can also start on a different port: memox start --port <port_number>\n`);
          process.exit(1);
        } else {
          reject(err);
        }
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.serverInstance) {
        this.serverInstance.close(() => {
          this.router.close();
          console.log('[memox] REST API server stopped');
          resolve();
        });
      } else {
        this.router.close();
        resolve();
      }
    });
  }
}
