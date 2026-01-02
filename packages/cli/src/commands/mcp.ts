import { Command } from 'commander';
import { startMcpServer } from '../mcp/index.js';

export function createMcpCommand(): Command {
  return new Command('mcp')
    .description('Start MCP server for AI assistant integration (Claude, Cursor, etc.)')
    .action(async () => {
      try {
        await startMcpServer();
      } catch (error) {
        // Log to stderr to not interfere with MCP protocol
        console.error('Failed to start MCP server:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
