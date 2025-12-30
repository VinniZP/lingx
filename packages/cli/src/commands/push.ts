import { Command } from 'commander';
import { join } from 'path';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { CliTranslationsResponse } from '@localeflow/shared';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { createFormatter } from '../lib/formatter/index.js';
import { readTranslationFiles, computeTranslationDiff } from '../lib/translation-io.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';

interface PushOptions {
  project?: string;
  space?: string;
  branch?: string;
  source?: string;
  format?: 'json' | 'yaml';
  languages?: string;
  force?: boolean;
}

interface Conflict {
  lang: string;
  key: string;
  localValue: string;
  remoteValue: string;
}

export function createPushCommand(): Command {
  return new Command('push')
    .description('Upload local translations to the platform')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .option('-b, --branch <name>', 'Branch name')
    .option('-S, --source <dir>', 'Source directory')
    .option('--format <type>', 'File format: json or yaml')
    .option('-l, --languages <langs>', 'Languages to push (comma-separated)')
    .option('-f, --force', 'Force push without conflict prompts')
    .action(async (options: PushOptions) => {
      try {
        await push(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Push failed');
        process.exit(1);
      }
    });
}

/**
 * Resolve conflicts interactively with user prompts.
 * Returns approved and skipped conflicts.
 */
async function resolveConflicts(
  conflicts: Conflict[],
  force: boolean
): Promise<{ approved: Conflict[]; skipped: Conflict[] }> {
  if (force || conflicts.length === 0) {
    return { approved: conflicts, skipped: [] };
  }

  const approved: Conflict[] = [];
  const skipped: Conflict[] = [];
  let yesToAll = false;
  let skipAll = false;

  console.log();
  console.log(chalk.bold(`Found ${conflicts.length} conflict(s):`));
  console.log(chalk.gray('For each conflict, choose whether to update the server value.'));
  console.log();

  for (let i = 0; i < conflicts.length; i++) {
    const conflict = conflicts[i];

    if (skipAll) {
      skipped.push(conflict);
      continue;
    }
    if (yesToAll) {
      approved.push(conflict);
      continue;
    }

    console.log(chalk.cyan(`[${i + 1}/${conflicts.length}] ${conflict.key}`));
    console.log(chalk.gray(`  [${conflict.lang}]`));
    console.log(`    ${chalk.yellow('Server:')} ${conflict.remoteValue}`);
    console.log(`    ${chalk.green('Local:')}  ${conflict.localValue}`);

    const action = await select({
      message: 'Update server with local value?',
      choices: [
        { name: 'Yes - update this key', value: 'yes' },
        { name: 'No - keep server value', value: 'no' },
        { name: 'Yes to all remaining', value: 'yes-all' },
        { name: 'Skip all remaining', value: 'skip-all' },
      ],
    });

    switch (action) {
      case 'yes':
        approved.push(conflict);
        break;
      case 'no':
        skipped.push(conflict);
        break;
      case 'yes-all':
        yesToAll = true;
        approved.push(conflict);
        break;
      case 'skip-all':
        skipAll = true;
        skipped.push(conflict);
        break;
    }

    console.log();
  }

  return { approved, skipped };
}

async function push(options: PushOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Resolve options with config defaults
  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const branch = options.branch ?? config.defaultBranch;
  const format = options.format ?? config.format.type;
  const sourceDir = options.source ?? config.paths.translations;
  const force = options.force ?? false;

  // Language filtering: CLI flag > config > all detected
  const languageFilter = options.languages?.split(',').map(l => l.trim())
    ?? config.push?.languages;

  if (!project) {
    throw new Error('Project is required. Use --project or set in config file.');
  }
  if (!space) {
    throw new Error('Space is required. Use --space or set defaultSpace in config file.');
  }

  const spinner = createSpinner('Reading translation files...');
  spinner.start();

  try {
    const absSourceDir = join(cwd, sourceDir);

    // Create formatter
    const formatter = createFormatter(format, {
      nested: config.format.nested,
      indentation: config.format.indentation,
    });

    // Read all translation files
    let allTranslations = await readTranslationFiles(
      absSourceDir,
      format,
      formatter,
      config.push.filePattern
    );

    // Apply language filter if specified
    if (languageFilter && languageFilter.length > 0) {
      allTranslations = Object.fromEntries(
        Object.entries(allTranslations).filter(([lang]) =>
          languageFilter.includes(lang)
        )
      );
      spinner.text = `Pushing languages: ${languageFilter.join(', ')}`;
    }

    const languages = Object.keys(allTranslations);
    if (languages.length === 0) {
      if (languageFilter) {
        spinner.fail(`No matching translations found for languages: ${languageFilter.join(', ')}`);
      } else {
        spinner.fail(`No ${format} files found in ${sourceDir}`);
      }
      return;
    }

    spinner.text = 'Connecting to server...';

    const client = await createApiClientFromConfig(cwd);

    // Get branch ID
    const spaces = await client.get<{ spaces: { id: string; slug: string }[] }>(
      `/api/projects/${project}/spaces`
    );

    const targetSpace = spaces.spaces.find(s => s.slug === space);
    if (!targetSpace) {
      throw new Error(`Space "${space}" not found in project "${project}"`);
    }

    const spaceDetails = await client.get<{ branches: { id: string; name: string }[] }>(
      `/api/spaces/${targetSpace.id}`
    );

    const targetBranch = spaceDetails.branches.find(b => b.name === branch);
    if (!targetBranch) {
      throw new Error(`Branch "${branch}" not found in space "${space}"`);
    }

    // Fetch server translations for conflict detection
    spinner.text = 'Checking for conflicts...';
    const serverResponse = await client.get<CliTranslationsResponse>(
      `/api/branches/${targetBranch.id}/translations`
    );
    const serverTranslations = serverResponse.translations ?? {};

    // Compute diff
    const diff = computeTranslationDiff(allTranslations, serverTranslations);

    // Handle conflicts
    let pushPayload = structuredClone(allTranslations);
    let skippedCount = 0;
    let updatedCount = 0;
    let newCount = diff.localOnly.length;

    if (diff.conflicts.length > 0) {
      if (force) {
        spinner.stop();
        logger.warn(`Force mode: overriding ${diff.conflicts.length} conflict(s)`);
        updatedCount = diff.conflicts.length;
        spinner.start();
      } else {
        spinner.stop();

        const { approved, skipped } = await resolveConflicts(diff.conflicts, force);

        // Remove skipped conflicts from payload
        for (const skip of skipped) {
          if (pushPayload[skip.lang]) {
            delete pushPayload[skip.lang][skip.key];
          }
        }

        skippedCount = skipped.length;
        updatedCount = approved.length;
        spinner.start();
      }
    }

    // Check if there's anything to push
    const hasContent = Object.values(pushPayload).some(
      langTrans => Object.keys(langTrans).length > 0
    );

    if (!hasContent) {
      spinner.warn('Nothing to push (all changes skipped)');
      return;
    }

    // Push translations
    spinner.text = 'Uploading translations...';
    await client.put(`/api/branches/${targetBranch.id}/translations`, {
      translations: pushPayload,
    });

    let totalKeys = 0;
    for (const lang of languages) {
      if (pushPayload[lang]) {
        totalKeys += Object.keys(pushPayload[lang]).length;
      }
    }

    // Build success message
    const parts: string[] = [];
    if (updatedCount > 0) parts.push(`${updatedCount} updated`);
    if (newCount > 0) parts.push(`${newCount} new`);
    if (skippedCount > 0) parts.push(`${skippedCount} skipped`);

    const summary = parts.length > 0 ? ` (${parts.join(', ')})` : '';
    spinner.succeed(`Pushed ${totalKeys} keys across ${languages.length} language(s)${summary}`);

    for (const lang of languages) {
      if (pushPayload[lang]) {
        logger.info(`  ${lang}: ${Object.keys(pushPayload[lang]).length} keys`);
      }
    }
  } catch (error) {
    spinner.fail('Failed to push translations');
    throw error;
  }
}
