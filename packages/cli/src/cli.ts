import { Command } from 'commander';
import { createAuthCommand } from './commands/auth/index.js';

const VERSION = '0.0.0';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('lf')
    .description('Localeflow CLI - Translation management for developers')
    .version(VERSION);

  // Register command groups
  program.addCommand(createAuthCommand());

  // Placeholder for future commands
  // program.addCommand(createPullCommand());
  // program.addCommand(createPushCommand());
  // program.addCommand(createSyncCommand());
  // program.addCommand(createExtractCommand());
  // program.addCommand(createCheckCommand());
  // program.addCommand(createBranchCommand());

  return program;
}
