import { Command } from 'commander';
import { createBranchCreateCommand } from './create.js';
import { createBranchListCommand } from './list.js';
import { createBranchDiffCommand } from './diff.js';
import { createBranchMergeCommand } from './merge.js';

export function createBranchCommand(): Command {
  const branch = new Command('branch').description('Manage branches');

  branch.addCommand(createBranchCreateCommand());
  branch.addCommand(createBranchListCommand());
  branch.addCommand(createBranchDiffCommand());
  branch.addCommand(createBranchMergeCommand());

  return branch;
}
