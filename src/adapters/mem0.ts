import { IMemoryAdapter, MemoryPayload, MemorySearchResult } from '../core/types';
import * as crypto from 'crypto';

interface LocalMemoryRecord {
  id: string;
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class Mem0Adapter implements IMemoryAdapter {
  readonly name = 'mem0';
  private config: any;
  private isMockMode = true;
  
  // In-memory fallback database
  private static mockDb: LocalMemoryRecord[] = [];

  constructor(config?: any) {
    this.config = config;
    if (config?.apiKey) {
      this.isMockMode = false;
    } else {
      console.info('[memox] Mem0 API key not provided. Running Mem0Adapter in Mock Mode (In-Memory).');
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
      Mem0Adapter.mockDb.push(record);
      return;
    }

    // Official Mem0 API call using native fetch
    try {
      const response = await fetch('https://api.mem0.ai/v1/memories/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: payload.content }],
          user_id: payload.sessionId,
          metadata: payload.metadata
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mem0 API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (err: any) {
      console.error(`[memox] Mem0 write failed: ${err.message || err}.`);
      throw err;
    }
  }

  public async load(sessionId: string, query: string, limit = 10): Promise<MemorySearchResult[]> {
    if (this.isMockMode) {
      return this.runMockSearch(sessionId, query, limit);
    }

    try {
      const url = `https://api.mem0.ai/v1/memories/?user_id=${encodeURIComponent(sessionId)}&query=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mem0 API search failed: ${response.status} - ${errorText}`);
      }

      const memories = (await response.json()) as any[];
      return memories.slice(0, limit).map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        sessionId: sessionId,
        content: m.memory || m.content || '',
        metadata: m.metadata || {},
        score: m.score || 1.0,
        timestamp: m.updated_at || m.created_at || new Date().toISOString()
      }));
    } catch (err: any) {
      console.error(`[memox] Mem0 load failed: ${err.message || err}.`);
      throw err;
    }
  }

  private runMockSearch(sessionId: string, queryStr: string, limit: number): MemorySearchResult[] {
    const sessionRecords = Mem0Adapter.mockDb.filter(r => r.sessionId === sessionId);
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
