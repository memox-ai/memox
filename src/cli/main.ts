#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { RESTServer } from '../api/server';
import { MCPServer } from '../mcp/server';
import { MemoryRouter } from '../core/router';
import { runInstaller, runUninstaller } from './installer';

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
    connectionString: "postgresql://postgres:password@localhost:5432/memox"
    tableName: memox_memories
    vectorDimension: 1536
  redis:
    url: "redis://localhost:6379"
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
      purple + "    .---.      _ __ ___   ___ _ __ ___   _____  __\n" +
      purple + "   /  _  \\    | '_ ` _ \\ / _ \\ '_ ` _ \\ / _ \\ \\/ /\n" +
      cyan   + "  |  / \\  |   | | | | | |  __/ | | | | | (_) >  < \n" +
      cyan   + "  |_/   \\_|   |_| |_| |_|\\___|_| |_| |_|\\___/_/\\_\\\n" + reset
    );
    console.log('memox initialized successfully! Use "memox start" to spin up the local REST API.');
  });

// install command
program
  .command('install')
  .description('Scan AI coding agent config directories and write the memox MCP configuration')
  .action(async () => {
    await runInstaller();
  });

// uninstall command
program
  .command('uninstall')
  .description('Scan AI coding agent config directories and remove the memox MCP configuration')
  .action(async () => {
    await runUninstaller();
  });

// start command
program
  .command('start')
  .description('Start the local REST API gateway')
  .option('-p, --port <number>', 'Port to run the REST API gateway', '16369')
  .option('-d, --daemon', 'Run as a background daemon process')
  .action(async (options) => {
    const port = parseInt(options.port, 10);

    if (options.daemon && process.env.MEMOX_DAEMON_CHILD !== 'true') {
      const memoxDir = path.join(os.homedir(), '.memox');
      const pidPath = path.join(memoxDir, 'daemon.pid');
      const logPath = path.join(memoxDir, 'daemon.log');

      if (!fs.existsSync(memoxDir)) {
        fs.mkdirSync(memoxDir, { recursive: true });
      }

      if (fs.existsSync(pidPath)) {
        const existingPid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
        try {
          process.kill(existingPid, 0);
          console.error(`\x1b[31m[memox] Daemon is already running (PID: ${existingPid}).\x1b[0m`);
          console.error(`  Please stop it first using 'memox stop' or use a different port.`);
          process.exit(1);
        } catch (e) {
          try {
            fs.unlinkSync(pidPath);
          } catch (unlinkErr) {}
        }
      }

      console.log(`[memox] Starting memox daemon in the background...`);

      const scriptPath = process.argv[1];
      const logStream = fs.openSync(logPath, 'a');

      const child = spawn(
        process.execPath,
        [scriptPath, 'start', '--port', port.toString()],
        {
          detached: true,
          stdio: ['ignore', logStream, logStream],
          env: {
            ...process.env,
            MEMOX_DAEMON_CHILD: 'true'
          }
        }
      );

      child.unref();

      if (child.pid) {
        fs.writeFileSync(pidPath, child.pid.toString(), 'utf8');
        console.log(`\x1b[32m[memox] Daemon successfully started!\x1b[0m`);
        console.log(`  - Port: ${port}`);
        console.log(`  - PID: ${child.pid}`);
        console.log(`  - Log File: ${logPath}`);
      }
      process.exit(0);
    }

    const server = new RESTServer(port);
    await server.start();

    // Handle process exits gracefully
    process.on('SIGINT', async () => {
      console.log('\n[memox] Shutting down REST API...');
      await server.stop();
      process.exit(0);
    });
  });

// stop command
program
  .command('stop')
  .description('Stop the background memox daemon process')
  .action(async () => {
    const memoxDir = path.join(os.homedir(), '.memox');
    const pidPath = path.join(memoxDir, 'daemon.pid');

    if (!fs.existsSync(pidPath)) {
      console.log('[memox] No daemon PID file found. Is the daemon running?');
      return;
    }

    const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
    console.log(`[memox] Stopping daemon process with PID ${pid}...`);

    try {
      process.kill(pid, 'SIGINT');
      
      let exited = false;
      for (let i = 0; i < 30; i++) {
        try {
          process.kill(pid, 0);
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          exited = true;
          break;
        }
      }

      if (exited) {
        console.log(`\x1b[32m[memox] Stopped daemon process ${pid}.\x1b[0m`);
      } else {
        process.kill(pid, 'SIGKILL');
        console.log(`\x1b[33m[memox] Force-killed daemon process ${pid}.\x1b[0m`);
      }
    } catch (err: any) {
      console.log(`[memox] Daemon process ${pid} was not running: ${err.message}`);
    }

    try {
      fs.unlinkSync(pidPath);
    } catch (e) {}
  });

// status command
program
  .command('status')
  .description('Check the status of the background memox daemon')
  .action(() => {
    const memoxDir = path.join(os.homedir(), '.memox');
    const pidPath = path.join(memoxDir, 'daemon.pid');

    if (!fs.existsSync(pidPath)) {
      console.log('[memox] Status: \x1b[31mstopped\x1b[0m (no PID file found)');
      return;
    }

    const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
    try {
      process.kill(pid, 0);
      console.log(`[memox] Status: \x1b[32mrunning\x1b[0m (PID: ${pid})`);
      const logPath = path.join(memoxDir, 'daemon.log');
      if (fs.existsSync(logPath)) {
        console.log(`  Log File: ${logPath}`);
      }
    } catch (e) {
      console.log(`[memox] Status: \x1b[31mstopped\x1b[0m (PID ${pid} file exists but process is dead)`);
      try {
        fs.unlinkSync(pidPath);
      } catch (err) {}
    }
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

if (process.argv.length <= 2) {
  const purple = '\x1b[35m';
  const cyan = '\x1b[36m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  
  console.log(
    "\n" +
    purple + "    .---.      _ __ ___   ___ _ __ ___   _____  __\n" +
    purple + "   /  _  \\    | '_ ` _ \\ / _ \\ '_ ` _ \\ / _ \\ \\/ /\n" +
    cyan   + "  |  / \\  |   | | | | | |  __/ | | | | | (_) >  < \n" +
    cyan   + "  |_/   \\_|   |_| |_| |_|\\___|_| |_| |_|\\___/_/\\_\\\n" + reset
  );
  console.log(bold + 'Welcome to memox! ' + reset + 'The universal memory bridge for AI agents.\n');
  console.log('Quick Start:');
  console.log(`  ${cyan}memox init --local${reset}   Initialize configurations in current directory`);
  console.log(`  ${cyan}memox install${reset}        Auto-register MCP with AI coding agents`);
  console.log(`  ${cyan}memox uninstall${reset}      Remove MCP registration from AI coding agents`);
  console.log(`  ${cyan}memox start -d${reset}       Start the REST API as a background daemon`);
  console.log(`  ${cyan}memox status${reset}         Check daemon running status`);
  console.log(`  ${cyan}memox stop${reset}           Stop the background daemon process`);
  console.log(`  ${cyan}memox --help${reset}         View complete command line reference\n`);
  
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
