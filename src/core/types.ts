export interface MemoryPayload {
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  ttl_seconds?: number;
}

export interface MemorySearchQuery {
  sessionId: string;
  query: string;
  limit?: number;
}

export interface MemorySearchResult {
  id: string;
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  score: number;
  timestamp: string;
}

export interface IMemoryAdapter {
  name: string;
  write(payload: MemoryPayload): Promise<void>;
  load(sessionId: string, query: string, limit?: number): Promise<MemorySearchResult[]>;
}

export interface DatabaseConfig {
  postgres?: {
    connectionString?: string;
    tableName?: string;
    vectorDimension?: number;
  };
  redis?: {
    url?: string;
    indexName?: string;
    vectorDimension?: number;
  };
  sqlite?: {
    path?: string;
  };
}

export interface MaASConfig {
  mem0?: {
    apiKey?: string;
  };
  zep?: {
    apiKey?: string;
    apiUrl?: string;
  };
}

export interface PolicyConfig {
  piiScrubbing?: {
    enabled: boolean;
    patterns?: Array<{ name: string; regex: string }>;
  };
  ttl?: {
    defaultTtlSeconds?: number;
    enforceTtl: boolean;
  };
}

export interface RouterConfig {
  primaryProvider: 'postgres' | 'redis' | 'mem0' | 'zep';
  fallbackProvider?: 'postgres' | 'redis' | 'mem0' | 'zep';
  enableAuditLogs?: boolean;
}

export interface MemoxConfig {
  router: RouterConfig;
  policies?: PolicyConfig;
  databases?: DatabaseConfig;
  external?: MaASConfig;
}
