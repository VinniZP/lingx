import { Command } from 'commander';
import { createAuthCommand } from './commands/auth/index.js';
import { createPullCommand } from './commands/pull.js';
import { createPushCommand } from './commands/push.js';
import { createSyncCommand } from './commands/sync.js';
import { createExtractCommand } from './commands/extract.js';

const VERSION = '0.0.0';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('lf')
    .description('Localeflow CLI - Translation management for developers')
    .version(VERSION);

  // Register command groups
  program.addCommand(createAuthCommand());
  program.addCommand(createPullCommand());
  program.addCommand(createPushCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createExtractCommand());

  // Placeholder for future commands
  // program.addCommand(createCheckCommand());
  // program.addCommand(createBranchCommand());

  return program;
}
