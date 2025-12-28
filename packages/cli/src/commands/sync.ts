import { Command } from 'commander';
import { join } from 'path';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { createFormatter } from '../lib/formatter/index.js';
import {
  readTranslationFiles,
  writeTranslationFile,
  computeTranslationDiff,
} from '../lib/translation-io.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import chalk from 'chalk';

interface SyncOptions {
  project?: string;
  space?: string;
  branch?: string;
  dir?: string;
  format?: 'json' | 'yaml';
}

interface TranslationResponse {
  translations: Record<string, Record<string, string>>;
  languages: string[];
}

export function createSyncCommand(): Command {
  return new Command('sync')
    .description('Bidirectional sync between local and remote translations')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .option('-b, --branch <name>', 'Branch name')
    .option('-d, --dir <dir>', 'Translation directory')
    .option('-f, --format <type>', 'File format: json or yaml')
    .action(async (options: SyncOptions) => {
      try {
        await sync(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Sync failed');
        process.exit(1);
      }
    });
}

async function sync(options: SyncOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Resolve options with config defaults
  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const branch = options.branch ?? config.defaultBranch;
  const format = options.format ?? config.format.type;
  const dir = options.dir ?? config.paths.translations;

  if (!project) {
    throw new Error('Project is required. Use --project or set in config file.');
  }
  if (!space) {
    throw new Error('Space is required. Use --space or set defaultSpace in config file.');
  }

  const spinner = createSpinner('Analyzing translations...');
  spinner.start();

  try {
    const client = await createApiClientFromConfig(cwd);
    const formatter = createFormatter(format, {
      nested: config.format.nested,
      indentation: config.format.indentation,
    });

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

    // Fetch remote translations
    const remote = await client.get<TranslationResponse>(
      `/api/branches/${targetBranch.id}/translations`
    );

    // Read local translations
    const absDir = join(cwd, dir);
    const local = await readTranslationFiles(absDir, format, formatter, config.pull.filePattern);

    // Compute diff
    const diff = computeTranslationDiff(local, remote.translations);

    spinner.stop();

    // Report results
    console.log();
    console.log(chalk.bold('Sync Analysis:'));
    console.log();

    if (diff.localOnly.length > 0) {
      console.log(chalk.green(`  ${diff.localOnly.length} key(s) only in local files (will be uploaded)`));
    }

    if (diff.remoteOnly.length > 0) {
      console.log(chalk.blue(`  ${diff.remoteOnly.length} key(s) only in remote (will be downloaded)`));
    }

    if (diff.conflicts.length > 0) {
      console.log(chalk.yellow(`  ${diff.conflicts.length} conflict(s) detected`));
      console.log();
      console.log(chalk.bold('Conflicts:'));
      for (const conflict of diff.conflicts) {
        console.log(`  ${chalk.cyan(conflict.key)} [${conflict.lang}]`);
        console.log(`    Local:  "${conflict.localValue}"`);
        console.log(`    Remote: "${conflict.remoteValue}"`);
      }
      console.log();
      logger.warn('Resolve conflicts manually before syncing.');
      logger.info('Use "lf pull" to overwrite local with remote, or "lf push" to overwrite remote with local.');
      process.exit(2); // Exit code 2 for conflicts
    }

    if (diff.localOnly.length === 0 && diff.remoteOnly.length === 0) {
      logger.success('Everything is in sync!');
      return;
    }

    // Apply sync
    const syncSpinner = createSpinner('Syncing translations...');
    syncSpinner.start();

    // Upload local-only translations
    if (diff.localOnly.length > 0) {
      const toUpload: Record<string, Record<string, string>> = {};
      for (const { lang, key, value } of diff.localOnly) {
        if (!toUpload[lang]) toUpload[lang] = {};
        toUpload[lang][key] = value;
      }
      await client.put(`/api/branches/${targetBranch.id}/translations`, {
        translations: toUpload,
      });
    }

    // Download remote-only translations - merge with existing local
    if (diff.remoteOnly.length > 0) {
      // Merge remote-only keys into local
      for (const { lang, key, value } of diff.remoteOnly) {
        if (!local[lang]) local[lang] = {};
        local[lang][key] = value;
      }

      // Write updated files for languages that have remote-only keys
      const affectedLanguages = new Set(diff.remoteOnly.map(r => r.lang));
      for (const lang of affectedLanguages) {
        const translations = local[lang];
        if (translations && Object.keys(translations).length > 0) {
          const fileName = config.pull.filePattern.replace('{lang}', lang) || `${lang}${formatter.extension}`;
          const filePath = join(absDir, fileName);
          await writeTranslationFile(filePath, translations, formatter);
        }
      }
    }

    syncSpinner.succeed('Sync complete!');

    if (diff.localOnly.length > 0) {
      logger.info(`  Uploaded ${diff.localOnly.length} new key(s)`);
    }
    if (diff.remoteOnly.length > 0) {
      logger.info(`  Downloaded ${diff.remoteOnly.length} new key(s)`);
    }
  } catch (error) {
    spinner.fail('Sync failed');
    throw error;
  }
}
