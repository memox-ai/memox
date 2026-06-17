import * as http from 'http';

export interface MemoryPayload {
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  ttl_seconds?: number;
}

export interface MemorySearchResult {
  id: string;
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  score: number;
  timestamp: string;
}

export class MemoxClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:16369') {
    this.baseUrl = baseUrl;
  }

  /**
   * Write memory payload to the REST API server
   */
  public async write(
    sessionId: string,
    content: string,
    metadata?: Record<string, any>,
    ttlSeconds?: number
  ): Promise<boolean> {
    const payload = {
      sessionId,
      content,
      metadata,
      ttl_seconds: ttlSeconds
    };

    try {
      const response = await this.request('/v1/memory/write', 'POST', payload);
      return response.success === true;
    } catch (err: any) {
      console.error(`[MemoxClient] Write failed: ${err.message || err}`);
      throw err;
    }
  }

  /**
   * Load memory context from the REST API server
   */
  public async load(
    sessionId: string,
    query: string,
    limit?: number
  ): Promise<MemorySearchResult[]> {
    const payload = {
      sessionId,
      query,
      limit
    };

    try {
      const response = await this.request('/v1/memory/load', 'POST', payload);
      return response.memories || [];
    } catch (err: any) {
      console.error(`[MemoxClient] Load failed: ${err.message || err}`);
      throw err;
    }
  }

  /**
   * Helper utility for LangGraph integration.
   * Returns a LangGraph node function that automatically stores user and agent messages into memox memory.
   */
  public getLangGraphNode(sessionId: string) {
    return async (state: { messages: Array<{ role: string; content: string }> }) => {
      if (!state.messages || state.messages.length === 0) {
        return {};
      }
      
      const lastMessage = state.messages[state.messages.length - 1];
      await this.write(sessionId, lastMessage.content, {
        role: lastMessage.role,
        source: 'langgraph-node'
      });

      return {};
    };
  }

  /**
   * Private HTTP requester utility using Node native http
   */
  private request(path: string, method: 'POST', body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const data = JSON.stringify(body);

      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = http.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseBody));
            } catch (err) {
              reject(new Error(`Failed to parse JSON response: ${responseBody}`));
            }
          } else {
            reject(new Error(`HTTP Error ${res.statusCode}: ${responseBody}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(data);
      req.end();
    });
  }
}
