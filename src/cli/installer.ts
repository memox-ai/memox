import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface AgentConfig {
  name: string;
  configPath: string;
  requiresParentDir: boolean;
  mcpConfigKey: string;
  updateFn: (current: any, executablePath: string) => any;
}

export async function runInstaller(overrideHome?: string) {
  const home = overrideHome || os.homedir();
  const isTS = __filename.endsWith('.ts');
  const executablePath = isTS
    ? path.resolve(__filename, '..', '..', '..', 'dist', 'cli', 'main.js')
    : path.resolve(__filename, '..', 'main.js');

  console.log(`[memox] Resolving built CLI script to: ${executablePath}`);

  const agents: AgentConfig[] = [
    {
      name: 'Claude Desktop',
      configPath: path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: (current, execPath) => {
        const mcpServers = current.mcpServers || {};
        mcpServers.memox = {
          command: 'node',
          args: [execPath, 'mcp']
        };
        current.mcpServers = mcpServers;
        return current;
      }
    },
    {
      name: 'Windsurf',
      configPath: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: (current, execPath) => {
        const mcpServers = current.mcpServers || {};
        mcpServers.memox = {
          command: 'node',
          args: [execPath, 'mcp']
        };
        current.mcpServers = mcpServers;
        return current;
      }
    },
    {
      name: 'Cline (VS Code Extension)',
      configPath: path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: (current, execPath) => {
        const mcpServers = current.mcpServers || {};
        mcpServers.memox = {
          command: 'node',
          args: [execPath, 'mcp'],
          disabled: false,
          autoApprove: []
        };
        current.mcpServers = mcpServers;
        return current;
      }
    },
    {
      name: 'Roo Code (VS Code Extension)',
      configPath: path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'roodev.roo-cline', 'settings', 'cline_mcp_settings.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: (current, execPath) => {
        const mcpServers = current.mcpServers || {};
        mcpServers.memox = {
          command: 'node',
          args: [execPath, 'mcp'],
          disabled: false,
          autoApprove: []
        };
        current.mcpServers = mcpServers;
        return current;
      }
    }
  ];

  let configuredCount = 0;

  for (const agent of agents) {
    const parentDir = path.dirname(agent.configPath);
    if (!fs.existsSync(parentDir)) {
      continue;
    }

    console.log(`\n[memox] Scanning for ${agent.name}...`);
    try {
      let configData: any = {};
      if (fs.existsSync(agent.configPath)) {
        // Backup existing config
        const backupPath = `${agent.configPath}.backup`;
        fs.copyFileSync(agent.configPath, backupPath);
        console.log(`  [+] Created backup of existing config at: ${backupPath}`);

        const fileContent = fs.readFileSync(agent.configPath, 'utf8');
        try {
          configData = JSON.parse(fileContent);
        } catch (err) {
          console.warn(`  [-] Warning: Config file at ${agent.configPath} is not valid JSON. Overwriting.`);
          configData = {};
        }
      }

      const updatedConfig = agent.updateFn(configData, executablePath);
      fs.writeFileSync(agent.configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
      console.log(`  [+] Successfully registered memox MCP in ${agent.configPath}`);
      configuredCount++;
    } catch (err: any) {
      console.error(`  [-] Error configuring ${agent.name}: ${err.message || err}`);
    }
  }

  console.log('\n=========================================');
  if (configuredCount > 0) {
    console.log(`[memox] Installation complete! Configured ${configuredCount} AI coding agent(s).`);
  } else {
    console.log('[memox] Warning: No active AI coding agent configurations were detected.');
    console.log('  Please make sure Claude Desktop, Windsurf, Cline, or Roo Code is installed.');
  }

  console.log('\nTo configure Cursor or other editors manually, add this MCP server configuration:');
  console.log(JSON.stringify({
    name: 'memox',
    type: 'stdio',
    command: 'node',
    args: [executablePath, 'mcp']
  }, null, 2));
  console.log('=========================================\n');
}
