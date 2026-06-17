#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RESTServer } from '../api/server';
import { MCPServer } from '../mcp/server';
import { MemoryRouter } from '../core/router';

const program = new Command();

program
  .name('memox')
  .description('Enterprise-grade, universal, polyglot memory bridge for AI agents')
  .version('0.1.0');

// init command
program
  .command('init')
  .description('Initialize memox configurations and folder structure')
  .option('-l, --local', 'Initialize in the current working directory')
  .action((options) => {
    const memoxDir = options.local
      ? path.join(process.cwd(), '.memox')
      : path.join(os.homedir(), '.memox');
    const configPath = path.join(memoxDir, 'config.yaml');

    if (!fs.existsSync(memoxDir)) {
      fs.mkdirSync(memoxDir, { recursive: true });
      console.log(`Created configuration directory: ${memoxDir}`);
    }

    const defaultYaml = `# memox configuration file
router:
  primaryProvider: postgres
  fallbackProvider: redis
  enableAuditLogs: true

policies:
  piiScrubbing:
    enabled: true
    patterns: []
  ttl:
    enforceTtl: true
    defaultTtlSeconds: 3600

databases:
  postgres:
    connectionString: ""
    tableName: memox_memories
    vectorDimension: 1536
  redis:
    url: ""
    indexName: memox_idx
    vectorDimension: 1536

external:
  mem0:
    apiKey: ""
  zep:
    apiKey: ""
    apiUrl: "https://api.getzep.com"
`;

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, defaultYaml, 'utf8');
      console.log(`Initialized default configuration file: ${configPath}`);
    } else {
      console.log(`Configuration file already exists: ${configPath}`);
    }
    
    // Create database history file
    const dbPath = path.join(memoxDir, 'history.db');
    if (!fs.existsSync(dbPath)) {
      console.log(`SQLite routing database initialized at: ${dbPath}`);
    }
    
    const purple = '\x1b[35m';
    const cyan = '\x1b[36m';
    const reset = '\x1b[0m';
    console.log(
      "\n" +
      purple + "  _ __ ___   ___ _ __ ___   _____  __\n" +
      purple + " | '_ ` _ \\ / _ \\ '_ ` _ \\ / _ \\ \\/ /\n" +
      cyan   + " | | | | | |  __/ | | | | | (_) >  < \n" +
      cyan   + " |_| |_| |_|\\___|_| |_| |_|\\___/_/\\_\\\n" + reset
    );
    console.log('memox initialized successfully! Use "memox start" to spin up the local REST API.');
  });

// start command
program
  .command('start')
  .description('Start the local REST API gateway')
  .option('-p, --port <number>', 'Port to run the REST API gateway', '3000')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const server = new RESTServer(port);
    await server.start();

    // Handle process exits gracefully
    process.on('SIGINT', async () => {
      console.log('\n[memox] Shutting down REST API...');
      await server.stop();
      process.exit(0);
    });
  });

// mcp command
program
  .command('mcp')
  .description('Run memox as an MCP (Model Context Protocol) server over stdio')
  .action(async () => {
    const mcpServer = new MCPServer();
    await mcpServer.start();
  });

// write command
program
  .command('write')
  .description('Write a memory payload directly from the CLI')
  .requiredOption('-s, --session <id>', 'Session ID')
  .requiredOption('-c, --content <text>', 'Memory content')
  .option('-t, --ttl <seconds>', 'TTL in seconds')
  .action(async (options) => {
    const router = new MemoryRouter();
    try {
      const ttl_seconds = options.ttl ? parseInt(options.ttl, 10) : undefined;
      await router.write({
        sessionId: options.session,
        content: options.content,
        ttl_seconds
      });
      console.log('\nMemory successfully written.');
    } catch (err: any) {
      console.error('\nError writing memory:', err.message || err);
      process.exit(1);
    } finally {
      router.close();
    }
  });

// load command
program
  .command('load')
  .description('Load memories matching a query from the CLI')
  .requiredOption('-s, --session <id>', 'Session ID')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('-l, --limit <number>', 'Limit of search results', '10')
  .action(async (options) => {
    const router = new MemoryRouter();
    try {
      const limit = parseInt(options.limit, 10);
      const results = await router.load(options.session, options.query, limit);
      console.log('\nRetrieve Results:');
      console.log(JSON.stringify(results, null, 2));
    } catch (err: any) {
      console.error('\nError loading memory:', err.message || err);
      process.exit(1);
    } finally {
      router.close();
    }
  });

program.parse(process.argv);
