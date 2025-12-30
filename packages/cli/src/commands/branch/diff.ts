import { Command } from 'commander';
import type { BranchDiffResponse } from '@localeflow/shared';
import { createApiClientFromConfig } from '../../lib/api.js';
import { loadConfig } from '../../lib/config.js';
import { formatDiffOutput } from '../../lib/diff/display.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

interface DiffOptions {
  project?: string;
  space?: string;
}

export function createBranchDiffCommand(): Command {
  return new Command('diff')
    .description('Compare two branches')
    .argument('<source>', 'Source branch name')
    .argument('[target]', 'Target branch name (default: main)')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .action(async (source: string, target: string | undefined, options: DiffOptions) => {
      try {
        await diffBranches(source, target ?? 'main', options);
      } catch (error) {
        logger.error(
          error instanceof Error ? error.message : 'Failed to compare branches'
        );
        process.exit(1);
      }
    });
}

async function diffBranches(
  source: string,
  target: string,
  options: DiffOptions
): Promise<void> {
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

  const spinner = createSpinner('Computing diff...');
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

    // Get branch IDs
    const spaceDetails = await client.get<{
      branches: { id: string; name: string }[];
    }>(`/api/spaces/${targetSpace.id}`);

    const sourceBranch = spaceDetails.branches.find((b) => b.name === source);
    const targetBranch = spaceDetails.branches.find((b) => b.name === target);

    if (!sourceBranch) {
      throw new Error(`Source branch "${source}" not found`);
    }
    if (!targetBranch) {
      throw new Error(`Target branch "${target}" not found`);
    }

    // Get diff
    const diff = await client.get<BranchDiffResponse>(
      `/api/branches/${sourceBranch.id}/diff/${targetBranch.id}`
    );

    spinner.stop();

    console.log(formatDiffOutput(diff));
  } catch (error) {
    spinner.fail('Failed to compute diff');
    throw error;
  }
}
