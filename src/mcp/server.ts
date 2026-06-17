import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MemoryRouter } from '../core/router';

export class MCPServer {
  private server: Server;
  private router: MemoryRouter;

  constructor() {
    this.router = new MemoryRouter();
    this.server = new Server(
      {
        name: 'memox',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupTools();
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'write_memory',
            description: 'Scrub and record a new memory action to memox distribution channels',
            inputSchema: {
              type: 'object',
              properties: {
                sessionId: { type: 'string', description: 'Unique session ID for the user/agent context' },
                content: { type: 'string', description: 'Memory payload content to store' },
                metadata: { type: 'object', description: 'Optional key-value metadata store', additionalProperties: true },
                ttl_seconds: { type: 'number', description: 'Optional custom TTL in seconds' }
              },
              required: ['sessionId', 'content']
            }
          },
          {
            name: 'load_memory',
            description: 'Retrieve memory context relevant to the user/agent queries',
            inputSchema: {
              type: 'object',
              properties: {
                sessionId: { type: 'string', description: 'Unique session ID to retrieve memories for' },
                query: { type: 'string', description: 'Semantic/keyword query to match against memories' },
                limit: { type: 'number', description: 'Optional limit for number of results', default: 10 }
              },
              required: ['sessionId', 'query']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'write_memory') {
          const { sessionId, content, metadata, ttl_seconds } = args as any;
          await this.router.write({ sessionId, content, metadata, ttl_seconds });
          return {
            content: [
              {
                type: 'text',
                text: `Successfully wrote memory for session ${sessionId}.`
              }
            ]
          };
        } else if (name === 'load_memory') {
          const { sessionId, query, limit } = args as any;
          const results = await this.router.load(sessionId, query, limit);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2)
              }
            ]
          };
        } else {
          throw new Error(`Tool not found: ${name}`);
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${err.message || err}`
            }
          ]
        };
      }
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[memox] MCP Server running on stdio');
  }
}
