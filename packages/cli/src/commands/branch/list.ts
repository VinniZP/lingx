import { Command } from 'commander';
import chalk from 'chalk';
import { createApiClientFromConfig } from '../../lib/api.js';
import { loadConfig } from '../../lib/config.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

interface ListOptions {
  project?: string;
  space?: string;
}

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  keyCount?: number;
}

export function createBranchListCommand(): Command {
  return new Command('list')
    .description('List branches in a space')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .action(async (options: ListOptions) => {
      try {
        await listBranches(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to list branches');
        process.exit(1);
      }
    });
}

async function listBranches(options: ListOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;

  if (!project) {
    throw new Error('Project is required. Use --project or set in config file.');
  }
  if (!space) {
    throw new Error('Space is required. Use --space or set defaultSpace in config file.');
  }

  const spinner = createSpinner('Fetching branches...');
  spinner.start();

  try {
    const client = await createApiClientFromConfig(cwd);

    // Get space ID
    const spaces = await client.get<{ spaces: { id: string; slug: string }[] }>(
      `/api/projects/${project}/spaces`
    );

    const targetSpace = spaces.spaces.find((s) => s.slug === space);
    if (!targetSpace) {
      throw new Error(`Space "${space}" not found in project "${project}"`);
    }

    // Get branches
    const result = await client.get<{ branches: Branch[] }>(
      `/api/spaces/${targetSpace.id}/branches`
    );

    spinner.stop();

    console.log();
    console.log(chalk.bold(`Branches in ${project}/${space}:`));
    console.log();

    if (result.branches.length === 0) {
      console.log(chalk.gray('  No branches found'));
      return;
    }

    for (const branch of result.branches) {
      const defaultBadge = branch.isDefault ? chalk.green(' (default)') : '';
      const keys =
        branch.keyCount !== undefined ? chalk.gray(` ${branch.keyCount} keys`) : '';
      const date = new Date(branch.createdAt).toLocaleDateString();

      console.log(`  ${chalk.cyan(branch.name)}${defaultBadge}`);
      console.log(chalk.gray(`    Created: ${date}${keys}`));
    }
    console.log();
  } catch (error) {
    spinner.fail('Failed to list branches');
    throw error;
  }
}
