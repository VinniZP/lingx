import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCoreTools } from './tools/core.js';
import { registerKeyTools } from './tools/keys.js';
import { registerBranchTools } from './tools/branches.js';
import { registerSearchTools } from './tools/search.js';
import { registerAiTools } from './tools/ai.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

const VERSION = '0.1.0';

/**
 * Creates and configures the Lingx MCP server.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'lingx',
      version: VERSION,
    },
    {
      instructions: `Lingx is a translation management system for developers.

Use these tools to:
- Pull/push/sync translations between local files and the Lingx platform
- Extract translation keys from source code
- Check translation coverage and quality
- Manage translation keys (add, remove, move)
- Work with translation branches
- Search keys and translations
- Get AI-assisted guidance for conflicts and quality issues

Before using most tools, ensure you have:
1. A lingx.config.ts file in your project root
2. Authenticated via 'lingx auth login'

Use lingx_status to check your current configuration.`,
    }
  );

  // Register all tools
  registerCoreTools(server);
  registerKeyTools(server);
  registerBranchTools(server);
  registerSearchTools(server);
  registerAiTools(server);

  // Register resources and prompts
  registerResources(server);
  registerPrompts(server);

  return server;
}

/**
 * Starts the MCP server with stdio transport.
 */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr so it doesn't interfere with stdio protocol
  console.error('Lingx MCP Server running on stdio');
}
