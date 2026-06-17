import { IMemoryAdapter, MemoryPayload, MemorySearchResult } from '../core/types';
import * as crypto from 'crypto';

interface LocalMemoryRecord {
  id: string;
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class RedisAdapter implements IMemoryAdapter {
  readonly name = 'redis';
  private config: any;
  private isMockMode = true;
  private client: any = null;

  // In-memory fallback database
  private static mockDb: LocalMemoryRecord[] = [];

  constructor(config?: any) {
    this.config = config;
    if (config?.url) {
      this.isMockMode = false;
      this.initConnection();
    } else {
      console.info('[memox] Redis url not provided. Running RedisAdapter in Mock Mode (In-Memory).');
    }
  }

  private async initConnection() {
    try {
      const redis = await import('redis');
      this.client = redis.createClient({ url: this.config.url });
      await this.client.connect();

      // Create vector index if not exists (using generic Redis search commands)
      const indexName = this.config.indexName || 'memox_idx';
      const prefix = 'memox:memory:';
      
      try {
        await this.client.ft.create(indexName, {
          '$.sessionId': {
            type: redis.SchemaFieldTypes.TEXT,
            AS: 'sessionId'
          },
          '$.content': {
            type: redis.SchemaFieldTypes.TEXT,
            AS: 'content'
          },
          '$.embedding': {
            type: redis.SchemaFieldTypes.VECTOR,
            AS: 'embedding',
            ALGORITHM: 'FLAT',
            TYPE: 'FLOAT32',
            DIM: this.config.vectorDimension || 1536,
            DISTANCE_METRIC: 'COSINE'
          }
        }, {
          ON: 'JSON',
          PREFIX: prefix
        });
      } catch (err: any) {
        if (err.message && err.message.includes('Index already exists')) {
          // Normal, do nothing
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.warn(`[memox] Redis connection failed: ${err.message || err}. Falling back to Mock Mode.`);
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
      RedisAdapter.mockDb.push(record);
      return;
    }

    const key = `memox:memory:${crypto.randomUUID()}`;
    const dim = this.config.vectorDimension || 1536;
    const dummyVector = new Float32Array(dim);

    await this.client.json.set(key, '$', {
      sessionId: payload.sessionId,
      content: payload.content,
      metadata: payload.metadata || {},
      embedding: Array.from(dummyVector),
      timestamp: new Date().toISOString()
    });
  }

  public async load(sessionId: string, query: string, limit = 10): Promise<MemorySearchResult[]> {
    if (this.isMockMode) {
      return this.runMockSearch(sessionId, query, limit);
    }

    // Basic load query in Redis Search
    const indexName = this.config.indexName || 'memox_idx';
    const redisQuery = `@sessionId:${sessionId}`;
    const searchRes = await this.client.ft.search(indexName, redisQuery, {
      LIMIT: { from: 0, size: limit }
    });

    return searchRes.documents.map((doc: any) => {
      const val = typeof doc.value === 'string' ? JSON.parse(doc.value) : doc.value;
      return {
        id: doc.id,
        sessionId: val.sessionId,
        content: val.content,
        metadata: val.metadata,
        score: 1.0,
        timestamp: val.timestamp || new Date().toISOString()
      };
    });
  }

  private runMockSearch(sessionId: string, queryStr: string, limit: number): MemorySearchResult[] {
    const sessionRecords = RedisAdapter.mockDb.filter(r => r.sessionId === sessionId);
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

    return results
      .filter(r => r.score > 0 || queryStr === '')
      .sort((a, b) => b.score - a.score || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}
