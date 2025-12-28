import { Command } from 'commander';
import { createApiClientFromConfig } from '../../lib/api.js';
import { loadConfig } from '../../lib/config.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

interface CreateOptions {
  from?: string;
  project?: string;
  space?: string;
}

export function createBranchCreateCommand(): Command {
  return new Command('create')
    .description('Create a new branch')
    .argument('<name>', 'Branch name')
    .option('-f, --from <name>', 'Source branch (default: main)')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .action(async (name: string, options: CreateOptions) => {
      try {
        await createBranch(name, options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to create branch');
        process.exit(1);
      }
    });
}

async function createBranch(name: string, options: CreateOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const fromBranch = options.from ?? 'main';

  if (!project) {
    throw new Error('Project is required. Use --project or set in config file.');
  }
  if (!space) {
    throw new Error('Space is required. Use --space or set defaultSpace in config file.');
  }

  const spinner = createSpinner('Creating branch...');
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

    // Get source branch ID
    const spaceDetails = await client.get<{
      branches: { id: string; name: string }[];
    }>(`/api/spaces/${targetSpace.id}`);

    const sourceBranch = spaceDetails.branches.find((b) => b.name === fromBranch);
    if (!sourceBranch) {
      throw new Error(`Source branch "${fromBranch}" not found in space "${space}"`);
    }

    // Create branch
    const result = await client.post<{ id: string; name: string; keyCount?: number }>(
      `/api/spaces/${targetSpace.id}/branches`,
      {
        name,
        fromBranchId: sourceBranch.id,
      }
    );

    spinner.succeed(`Created branch "${name}" from "${fromBranch}"`);
    if (result.keyCount !== undefined) {
      logger.info(`Copied ${result.keyCount} keys`);
    }
  } catch (error) {
    spinner.fail('Failed to create branch');
    throw error;
  }
}
