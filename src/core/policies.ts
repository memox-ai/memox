import { MemoryPayload, PolicyConfig } from './types';

export class PolicyEngine {
  private config?: PolicyConfig;
  
  // Standard PII regex definitions
  private defaultPatterns = [
    {
      name: 'SSN',
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      replacement: '[REDACTED_SSN]'
    },
    {
      name: 'API_KEY',
      regex: /\b(sk-[a-zA-Z0-9]{20,48}|ak-[a-zA-Z0-9]{20,48}|sec-[a-zA-Z0-9]{20,64}|[a-zA-Z0-9]{32,64}(?:key|token|secret))\b/gi,
      replacement: '[REDACTED_API_KEY]'
    },
    {
      name: 'CREDENTIALS',
      regex: /\b(password|passwd|credentials|client_secret)(?:\s+is)?\s*[:=]\s*["']?([a-zA-Z0-9_@#$!%*?&.-]{4,40})["']?/gi,
      replacement: '$1: [REDACTED_CREDENTIALS]'
    }
  ];

  constructor(config?: PolicyConfig) {
    this.config = config;
  }

  /**
   * Scrubs PII from the payload content.
   */
  public scrub(content: string): string {
    if (this.config?.piiScrubbing?.enabled === false) {
      return content;
    }

    let scrubbed = content;

    // Apply default patterns
    for (const pattern of this.defaultPatterns) {
      if (pattern.name === 'CREDENTIALS') {
        // Handle credential replacement carefully to preserve key prefix
        scrubbed = scrubbed.replace(pattern.regex, (match, key) => {
          return `${key}: [REDACTED_CREDENTIALS]`;
        });
      } else {
        scrubbed = scrubbed.replace(pattern.regex, pattern.replacement);
      }
    }

    // Apply custom patterns if configured
    if (this.config?.piiScrubbing?.patterns) {
      for (const custom of this.config.piiScrubbing.patterns) {
        try {
          const regex = new RegExp(custom.regex, 'g');
          scrubbed = scrubbed.replace(regex, `[REDACTED_${custom.name.toUpperCase()}]`);
        } catch (err) {
          console.error(`Invalid regex pattern configured for PII scrubbing: ${custom.name}`, err);
        }
      }
    }

    return scrubbed;
  }

  /**
   * Validates and applies TTL settings on memory payload.
   */
  public applyTTL(payload: MemoryPayload): MemoryPayload {
    const updated = { ...payload };
    
    // Check if TTL enforcement is enabled
    const enforceTtl = this.config?.ttl?.enforceTtl ?? true;
    const defaultTtl = this.config?.ttl?.defaultTtlSeconds;

    if (enforceTtl) {
      if (updated.ttl_seconds === undefined && defaultTtl !== undefined) {
        updated.ttl_seconds = defaultTtl;
      }
    }

    return updated;
  }

  /**
   * Middleware runner that applies all policies to an incoming payload
   */
  public process(payload: MemoryPayload): MemoryPayload {
    const scrubbedContent = this.scrub(payload.content);
    const withTTL = this.applyTTL({
      ...payload,
      content: scrubbedContent
    });
    
    return withTTL;
  }
}
