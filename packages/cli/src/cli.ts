import { Command } from 'commander';
import { createAuthCommand } from './commands/auth/index.js';
import { createInitCommand } from './commands/init.js';
import { createPullCommand } from './commands/pull.js';
import { createPushCommand } from './commands/push.js';
import { createSyncCommand } from './commands/sync.js';
import { createExtractCommand } from './commands/extract.js';
import { createCheckCommand } from './commands/check.js';
import { createBranchCommand } from './commands/branch/index.js';
import { createTypesCommand } from './commands/types.js';

const VERSION = '0.0.0';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('lf')
    .description('Localeflow CLI - Translation management for developers')
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
  program.addCommand(createTypesCommand());

  return program;
}
