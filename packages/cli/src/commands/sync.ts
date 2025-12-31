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
import { resolveConflicts } from '../utils/conflict-resolver.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import chalk from 'chalk';

interface SyncOptions {
  project?: string;
  space?: string;
  branch?: string;
  dir?: string;
  format?: 'json' | 'yaml';
  forceLocal?: boolean;
  forceRemote?: boolean;
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
    .option('--force-local', 'Resolve all conflicts by using local values')
    .option('--force-remote', 'Resolve all conflicts by using remote values')
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

    // Handle conflicts interactively
    let conflictResolution: { useLocal: typeof diff.conflicts; useRemote: typeof diff.conflicts } = {
      useLocal: [],
      useRemote: [],
    };

    if (diff.conflicts.length > 0) {
      console.log(chalk.yellow(`  ${diff.conflicts.length} conflict(s) detected`));
      spinner.stop();

      // Resolve conflicts interactively (or with force flags)
      const result = await resolveConflicts(diff.conflicts, {
        mode: 'sync',
        forceLocal: options.forceLocal,
        forceRemote: options.forceRemote,
      });

      conflictResolution = result;
      spinner.start();
    }

    // Check if anything needs to be done
    const hasLocalOnly = diff.localOnly.length > 0;
    const hasRemoteOnly = diff.remoteOnly.length > 0;
    const hasConflictsToUpload = conflictResolution.useLocal.length > 0;
    const hasConflictsToDownload = conflictResolution.useRemote.length > 0;

    if (!hasLocalOnly && !hasRemoteOnly && !hasConflictsToUpload && !hasConflictsToDownload) {
      spinner.stop();
      logger.success('Everything is in sync!');
      return;
    }

    // Apply sync
    spinner.text = 'Syncing translations...';

    // Build upload payload (local-only + conflicts resolved to local)
    const toUpload: Record<string, Record<string, string>> = {};
    for (const { lang, key, value } of diff.localOnly) {
      if (!toUpload[lang]) toUpload[lang] = {};
      toUpload[lang][key] = value;
    }
    for (const { lang, key, localValue } of conflictResolution.useLocal) {
      if (!toUpload[lang]) toUpload[lang] = {};
      toUpload[lang][key] = localValue;
    }

    // Upload if there's anything to upload
    if (Object.keys(toUpload).length > 0) {
      await client.put(`/api/branches/${targetBranch.id}/translations`, {
        translations: toUpload,
      });
    }

    // Build download changes (remote-only + conflicts resolved to remote)
    const toDownload: Array<{ lang: string; key: string; value: string }> = [
      ...diff.remoteOnly,
      ...conflictResolution.useRemote.map((c) => ({
        lang: c.lang,
        key: c.key,
        value: c.remoteValue,
      })),
    ];

    // Apply downloads to local files
    if (toDownload.length > 0) {
      for (const { lang, key, value } of toDownload) {
        if (!local[lang]) local[lang] = {};
        local[lang][key] = value;
      }

      // Write updated files for affected languages
      const affectedLanguages = new Set(toDownload.map((r) => r.lang));
      for (const lang of affectedLanguages) {
        const translations = local[lang];
        if (translations && Object.keys(translations).length > 0) {
          const fileName =
            config.pull.filePattern.replace('{lang}', lang) || `${lang}${formatter.extension}`;
          const filePath = join(absDir, fileName);
          await writeTranslationFile(filePath, translations, formatter);
        }
      }
    }

    spinner.succeed('Sync complete!');

    // Summary
    const uploadedNew = diff.localOnly.length;
    const downloadedNew = diff.remoteOnly.length;
    const conflictsToLocal = conflictResolution.useLocal.length;
    const conflictsToRemote = conflictResolution.useRemote.length;

    if (uploadedNew > 0) {
      logger.info(`  Uploaded ${uploadedNew} new key(s)`);
    }
    if (downloadedNew > 0) {
      logger.info(`  Downloaded ${downloadedNew} new key(s)`);
    }
    if (conflictsToLocal > 0) {
      logger.info(`  ${conflictsToLocal} conflict(s) resolved → uploaded local`);
    }
    if (conflictsToRemote > 0) {
      logger.info(`  ${conflictsToRemote} conflict(s) resolved → downloaded remote`);
    }
  } catch (error) {
    spinner.fail('Sync failed');
    throw error;
  }
}
