import { Command } from 'commander';
import { createAuthCommand } from './commands/auth/index.js';
import { createInitCommand } from './commands/init.js';
import { createPullCommand } from './commands/pull.js';
import { createPushCommand } from './commands/push.js';
import { createSyncCommand } from './commands/sync.js';
import { createExtractCommand } from './commands/extract.js';
import { createCheckCommand } from './commands/check.js';
import { createBranchCommand } from './commands/branch/index.js';
import { createKeyCommand } from './commands/key/index.js';
import { createTypesCommand } from './commands/types.js';
import { createContextCommand } from './commands/context.js';
import { createMcpCommand } from './commands/mcp.js';

const VERSION = '0.0.0';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('lingx')
    .description('Lingx CLI - Translation management for developers')
    .version(VERSION);

  // Register command groups
  program.addCommand(createAuthCommand());
  program.addCommand(createInitCommand());
  program.addCommand(createPullCommand());
  program.addCommand(createPushCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createExtractCommand());
  program.addCommand(createCheckCommand());
  program.addCommand(createBranchCommand());
  program.addCommand(createKeyCommand());
  program.addCommand(createTypesCommand());
  program.addCommand(createContextCommand());
  program.addCommand(createMcpCommand());

  return program;
}
