import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import type {
  BranchDiffResponse,
  ConflictEntry,
  MergeResponse,
} from '@lingx/shared';
import { createApiClientFromConfig } from '../../lib/api.js';
import { loadConfig } from '../../lib/config.js';
import { formatDiffOutput } from '../../lib/diff/display.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

interface MergeOptions {
  into?: string;
  project?: string;
  space?: string;
  interactive?: boolean;
  force?: boolean;
}

interface Resolution {
  key: string;
  resolution: 'source' | 'target' | Record<string, string>;
}

export function createBranchMergeCommand(): Command {
  return new Command('merge')
    .description('Merge a branch into another')
    .argument('<source>', 'Source branch name')
    .option('-i, --into <name>', 'Target branch (default: main)')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .option('--interactive', 'Resolve conflicts interactively')
    .option('--force', 'Overwrite all conflicts with source values')
    .action(async (source: string, options: MergeOptions) => {
      try {
        await mergeBranch(source, options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Merge failed');
        process.exit(1);
      }
    });
}

async function mergeBranch(source: string, options: MergeOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const target = options.into ?? 'main';

  if (!project) {
    throw new Error('Project is required. Use --project or set in config file.');
  }
  if (!space) {
    throw new Error('Space is required. Use --space or set defaultSpace in config file.');
  }

  const spinner = createSpinner('Checking for conflicts...');
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

    // Get diff first to check for conflicts
    const diff = await client.get<BranchDiffResponse>(
      `/api/branches/${sourceBranch.id}/diff/${targetBranch.id}`
    );

    spinner.stop();

    // Show diff summary
    console.log(formatDiffOutput(diff));

    // Handle conflicts
    let resolutions: Resolution[] = [];

    if (diff.conflicts.length > 0) {
      if (options.force) {
        // Force: use source values for all conflicts
        resolutions = diff.conflicts.map((c) => ({
          key: c.key,
          resolution: 'source' as const,
        }));
        logger.warn(
          `Forcing ${diff.conflicts.length} conflict(s) to use source values`
        );
      } else if (options.interactive) {
        // Interactive: prompt for each conflict
        resolutions = await resolveConflictsInteractively(diff.conflicts);
      } else {
        // Default: fail if conflicts exist
        logger.error(
          `Found ${diff.conflicts.length} conflict(s). Use --interactive to resolve or --force to overwrite.`
        );
        process.exit(1);
      }
    }

    // Perform merge
    const mergeSpinner = createSpinner('Merging branches...');
    mergeSpinner.start();

    const result = await client.post<MergeResponse>(
      `/api/branches/${sourceBranch.id}/merge`,
      {
        targetBranchId: targetBranch.id,
        resolutions: resolutions.length > 0 ? resolutions : undefined,
      }
    );

    if (result.success) {
      mergeSpinner.succeed(`Merged "${source}" into "${target}"`);
      logger.info(`${result.merged} key(s) merged`);
    } else {
      mergeSpinner.fail('Merge failed');
      if (result.conflicts && result.conflicts.length > 0) {
        logger.error(`${result.conflicts.length} unresolved conflict(s)`);
      }
      process.exit(1);
    }
  } catch (error) {
    spinner.fail('Merge failed');
    throw error;
  }
}

async function resolveConflictsInteractively(
  conflicts: ConflictEntry[]
): Promise<Resolution[]> {
  const resolutions: Resolution[] = [];

  console.log();
  console.log(chalk.bold('Resolve Conflicts:'));
  console.log(chalk.gray('For each conflict, choose which value to keep.'));
  console.log();

  for (let i = 0; i < conflicts.length; i++) {
    const conflict = conflicts[i];
    console.log(chalk.cyan(`[${i + 1}/${conflicts.length}] ${conflict.key}`));

    // Show values for each language
    for (const lang of new Set([
      ...Object.keys(conflict.source),
      ...Object.keys(conflict.target),
    ])) {
      const sourceVal = conflict.source[lang] ?? '(empty)';
      const targetVal = conflict.target[lang] ?? '(empty)';

      console.log(chalk.gray(`  [${lang}]`));
      console.log(`    ${chalk.green('Source:')} ${sourceVal}`);
      console.log(`    ${chalk.yellow('Target:')} ${targetVal}`);
    }

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Which value to keep?',
        choices: [
          { name: 'Use source value', value: 'source' },
          { name: 'Use target value', value: 'target' },
          { name: 'Skip (keep target, no change)', value: 'skip' },
        ],
      },
    ]);

    if (choice !== 'skip') {
      resolutions.push({
        key: conflict.key,
        resolution: choice as 'source' | 'target',
      });
    }

    console.log();
  }

  return resolutions;
}
