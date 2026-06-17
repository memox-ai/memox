import { IMemoryAdapter, MemoryPayload, MemorySearchResult } from '../core/types';
import * as crypto from 'crypto';

interface LocalMemoryRecord {
  id: string;
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class PostgresAdapter implements IMemoryAdapter {
  readonly name = 'postgres';
  private config: any;
  private isMockMode = true;
  private client: any = null;
  
  // In-memory fallback database
  private static mockDb: LocalMemoryRecord[] = [];

  constructor(config?: any) {
    this.config = config;
    if (config?.connectionString) {
      this.isMockMode = false;
      this.initConnection();
    } else {
      console.info('[memox] Postgres connectionString not provided. Running PostgresAdapter in Mock Mode (In-Memory).');
    }
  }

  private async initConnection() {
    try {
      // Dynamic import of pg to avoid hard dependency errors if not installed
      const pg = await import('pg');
      this.client = new pg.Pool({
        connectionString: this.config.connectionString
      });
      
      // Setup table and pgvector extension
      const query = `
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE IF NOT EXISTS ${this.config.tableName || 'memox_memories'} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata JSONB,
          embedding vector(${this.config.vectorDimension || 1536}),
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS memox_session_idx ON ${this.config.tableName || 'memox_memories'} (session_id);
      `;
      await this.client.query(query);
    } catch (err: any) {
      console.warn(`[memox] Postgres init failed: ${err.message || err}. Falling back to Mock Mode.`);
      this.isMockMode = true;
    }
  }

  public async write(payload: MemoryPayload): Promise<void> {
    if (this.isMockMode) {
      const record: LocalMemoryRecord = {
        id: crypto.randomUUID(),
        sessionId: payload.sessionId,
        content: payload.content,
        metadata: payload.metadata,
        timestamp: new Date().toISOString()
      };
      PostgresAdapter.mockDb.push(record);
      return;
    }

    // Real PG implementation (e.g. generating dummy or zero embedding vectors for testing)
    const tableName = this.config.tableName || 'memox_memories';
    const dim = this.config.vectorDimension || 1536;
    // Generate standard zero vector for pgvector payload
    const dummyVector = `[${new Array(dim).fill(0).join(',')}]`;
    
    const query = `
      INSERT INTO ${tableName} (session_id, content, metadata, embedding)
      VALUES ($1, $2, $3, $4)
    `;
    await this.client.query(query, [
      payload.sessionId,
      payload.content,
      JSON.stringify(payload.metadata || {}),
      dummyVector
    ]);
  }

  public async load(sessionId: string, query: string, limit = 10): Promise<MemorySearchResult[]> {
    if (this.isMockMode) {
      return this.runMockSearch(sessionId, query, limit);
    }

    const tableName = this.config.tableName || 'memox_memories';
    const dbQuery = `
      SELECT id, session_id, content, metadata, timestamp 
      FROM ${tableName}
      WHERE session_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    const res = await this.client.query(dbQuery, [sessionId, limit]);
    
    return res.rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      content: row.content,
      metadata: row.metadata,
      score: 1.0, // Default fallback score
      timestamp: row.timestamp.toISOString()
    }));
  }

  private runMockSearch(sessionId: string, queryStr: string, limit: number): MemorySearchResult[] {
    const sessionRecords = PostgresAdapter.mockDb.filter(r => r.sessionId === sessionId);
    const queryWords = queryStr.toLowerCase().split(/\s+/).filter(w => w.length > 1);

    const results = sessionRecords.map(r => {
      let score = 0;
      if (queryWords.length === 0) {
        score = 1.0;
      } else {
        const contentLower = r.content.toLowerCase();
        let matches = 0;
        for (const word of queryWords) {
          if (contentLower.includes(word)) {
            matches++;
          }
        }
        score = matches / queryWords.length;
      }
      return {
        id: r.id,
        sessionId: r.sessionId,
        content: r.content,
        metadata: r.metadata,
        score: parseFloat(score.toFixed(4)),
        timestamp: r.timestamp
      };
    });

    // Sort by similarity score, then by timestamp descending
    return results
      .filter(r => r.score > 0 || queryStr === '')
      .sort((a, b) => b.score - a.score || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}
