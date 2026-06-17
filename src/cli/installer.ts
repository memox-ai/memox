import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface AgentConfig {
  name: string;
  configPath: string;
  requiresParentDir: boolean;
  mcpConfigKey: string;
  updateFn: (current: any) => any;
  uninstallFn: (current: any) => any;
}

function getAgentsList(home: string): AgentConfig[] {
  const standardUpdate = (current: any) => {
    const mcpServers = current.mcpServers || {};
    mcpServers.memox = {
      command: 'memox',
      args: ['mcp']
    };
    current.mcpServers = mcpServers;
    return current;
  };

  const extensionUpdate = (current: any) => {
    const mcpServers = current.mcpServers || {};
    mcpServers.memox = {
      command: 'memox',
      args: ['mcp'],
      disabled: false,
      autoApprove: []
    };
    current.mcpServers = mcpServers;
    return current;
  };

  const standardUninstall = (current: any) => {
    if (current.mcpServers && current.mcpServers.memox) {
      delete current.mcpServers.memox;
    }
    return current;
  };

  return [
    {
      name: 'Claude Desktop',
      configPath: path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: standardUpdate,
      uninstallFn: standardUninstall
    },
    {
      name: 'Windsurf',
      configPath: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: standardUpdate,
      uninstallFn: standardUninstall
    },
    {
      name: 'Cline (VS Code Extension)',
      configPath: path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: extensionUpdate,
      uninstallFn: standardUninstall
    },
    {
      name: 'Roo Code (VS Code Extension)',
      configPath: path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'roodev.roo-cline', 'settings', 'cline_mcp_settings.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: extensionUpdate,
      uninstallFn: standardUninstall
    },
    {
      name: 'Cline (Cursor Extension)',
      configPath: path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: extensionUpdate,
      uninstallFn: standardUninstall
    },
    {
      name: 'Roo Code (Cursor Extension)',
      configPath: path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'roodev.roo-cline', 'settings', 'cline_mcp_settings.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: extensionUpdate,
      uninstallFn: standardUninstall
    },
    {
      name: 'Cursor Global MCP',
      configPath: path.join(home, '.cursor', 'mcp.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: standardUpdate,
      uninstallFn: standardUninstall
    },
    {
      name: 'Claude Code CLI',
      configPath: path.join(home, '.claude.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: standardUpdate,
      uninstallFn: standardUninstall
    },
    {
      name: 'Antigravity Coding Agent',
      configPath: path.join(home, '.gemini', 'antigravity', 'mcp_config.json'),
      requiresParentDir: true,
      mcpConfigKey: 'mcpServers',
      updateFn: standardUpdate,
      uninstallFn: standardUninstall
    }
  ];
}

export async function runInstaller(overrideHome?: string) {
  const home = overrideHome || os.homedir();
  const agents = getAgentsList(home);

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
      } else {
        // Parent folder exists but config file doesn't: initialize with basic structure
        configData = { mcpServers: {} };
      }

      const updatedConfig = agent.updateFn(configData);
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
    console.log('  Please make sure Claude Desktop, Windsurf, Cline, Roo Code, Cursor, or Claude Code is installed.');
  }

  console.log('\nTo configure Cursor or other editors manually, add this MCP server configuration:');
  console.log(JSON.stringify({
    name: 'memox',
    type: 'stdio',
    command: 'memox',
    args: ['mcp']
  }, null, 2));
  console.log('=========================================\n');
}

export async function runUninstaller(overrideHome?: string) {
  const home = overrideHome || os.homedir();
  const agents = getAgentsList(home);

  let removedCount = 0;

  for (const agent of agents) {
    const parentDir = path.dirname(agent.configPath);
    if (!fs.existsSync(parentDir) || !fs.existsSync(agent.configPath)) {
      continue;
    }

    console.log(`\n[memox] Scanning for memox in ${agent.name}...`);
    try {
      const fileContent = fs.readFileSync(agent.configPath, 'utf8');
      let configData: any = {};
      try {
        configData = JSON.parse(fileContent);
      } catch (err) {
        continue;
      }

      if (configData.mcpServers && configData.mcpServers.memox) {
        // Backup existing config
        const backupPath = `${agent.configPath}.backup`;
        fs.copyFileSync(agent.configPath, backupPath);
        console.log(`  [+] Created backup of existing config at: ${backupPath}`);

        const updatedConfig = agent.uninstallFn(configData);
        fs.writeFileSync(agent.configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
        console.log(`  [+] Successfully removed memox MCP from ${agent.configPath}`);
        removedCount++;
      }
    } catch (err: any) {
      console.error(`  [-] Error removing memox from ${agent.name}: ${err.message || err}`);
    }
  }

  console.log('\n=========================================');
  if (removedCount > 0) {
    console.log(`[memox] Uninstallation complete! Removed memox from ${removedCount} AI coding agent(s).`);
  } else {
    console.log('[memox] No active memox MCP registrations were detected.');
  }
  console.log('=========================================\n');
}
