import { IMemoryAdapter, MemoryPayload, MemorySearchResult } from '../core/types';
import * as crypto from 'crypto';

interface LocalMemoryRecord {
  id: string;
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class ZepAdapter implements IMemoryAdapter {
  readonly name = 'zep';
  private config: any;
  private isMockMode = true;
  private apiUrl = 'https://api.getzep.com';

  // In-memory fallback database
  private static mockDb: LocalMemoryRecord[] = [];

  constructor(config?: any) {
    this.config = config;
    if (config?.apiKey) {
      this.isMockMode = false;
      if (config.apiUrl) {
        this.apiUrl = config.apiUrl;
      }
    } else {
      console.info('[memox] Zep API key not provided. Running ZepAdapter in Mock Mode (In-Memory).');
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
      ZepAdapter.mockDb.push(record);
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/v1/sessions/${encodeURIComponent(payload.sessionId)}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fact: payload.content,
          metadata: payload.metadata
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zep API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (err: any) {
      console.error(`[memox] Zep write failed: ${err.message || err}.`);
      throw err;
    }
  }

  public async load(sessionId: string, query: string, limit = 10): Promise<MemorySearchResult[]> {
    if (this.isMockMode) {
      return this.runMockSearch(sessionId, query, limit);
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: query,
          limit: limit
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zep API search failed: ${response.status} - ${errorText}`);
      }

      const searchResults = (await response.json()) as any[];
      return searchResults.map((r: any) => ({
        id: r.memory?.uuid || crypto.randomUUID(),
        sessionId: sessionId,
        content: r.memory?.fact || r.memory?.content || '',
        metadata: r.memory?.metadata || {},
        score: r.dist || 1.0,
        timestamp: r.memory?.created_at || new Date().toISOString()
      }));
    } catch (err: any) {
      console.error(`[memox] Zep load failed: ${err.message || err}.`);
      throw err;
    }
  }

  private runMockSearch(sessionId: string, queryStr: string, limit: number): MemorySearchResult[] {
    const sessionRecords = ZepAdapter.mockDb.filter(r => r.sessionId === sessionId);
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
