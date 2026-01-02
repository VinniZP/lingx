import { Command } from 'commander';
import { createKeyAddCommand } from './add.js';
import { createKeyRemoveCommand } from './remove.js';
import { createKeyMoveCommand } from './move.js';

export function createKeyCommand(): Command {
  const key = new Command('key').description('Manage translation keys');

  key.addCommand(createKeyAddCommand());
  key.addCommand(createKeyRemoveCommand());
  key.addCommand(createKeyMoveCommand());

  return key;
}
