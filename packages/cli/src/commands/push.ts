import { Command } from 'commander';
import { join } from 'path';
import type { CliTranslationsResponse } from '@localeflow/shared';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { createFormatter } from '../lib/formatter/index.js';
import { readTranslationFiles, computeTranslationDiff } from '../lib/translation-io.js';
import { resolveConflicts, type TranslationConflict } from '../utils/conflict-resolver.js';
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
  delete?: boolean;
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
    .option('-d, --delete', 'Delete remote keys not present in local files')
    .action(async (options: PushOptions) => {
      try {
        await push(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Push failed');
        process.exit(1);
      }
    });
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
  const deleteRemote = options.delete ?? false;

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
      spinner.stop();

      // Resolve conflicts interactively (or with force flag)
      const { useLocal, useRemote } = await resolveConflicts(
        diff.conflicts as TranslationConflict[],
        { mode: 'push', forceLocal: force }
      );

      // Remove skipped conflicts (useRemote = keep server value = skip from push)
      for (const skip of useRemote) {
        if (pushPayload[skip.lang]) {
          delete pushPayload[skip.lang][skip.key];
        }
      }

      skippedCount = useRemote.length;
      updatedCount = useLocal.length;
      spinner.start();
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

    // Delete remote keys not in local files
    let deletedCount = 0;
    if (deleteRemote && diff.remoteOnly.length > 0) {
      spinner.text = 'Deleting remote-only keys...';

      // Get unique key names to delete
      const keysToDelete = new Set(diff.remoteOnly.map(r => r.key));

      // Fetch all keys from branch to get their IDs (paginated)
      interface KeyListResponse {
        keys: { id: string; name: string }[];
        total: number;
      }

      const keyNameToId = new Map<string, string>();
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const keyListResponse = await client.get<KeyListResponse>(
          `/api/branches/${targetBranch.id}/keys?limit=100&page=${page}`
        );

        for (const key of keyListResponse.keys) {
          if (keysToDelete.has(key.name)) {
            keyNameToId.set(key.name, key.id);
          }
        }

        hasMore = keyListResponse.keys.length === 100;
        page++;
      }

      // Get IDs for keys to delete
      const keyIdsToDelete = [...keyNameToId.values()];

      if (keyIdsToDelete.length > 0) {
        await client.post(`/api/branches/${targetBranch.id}/keys/bulk-delete`, {
          keyIds: keyIdsToDelete,
        });
        deletedCount = keyIdsToDelete.length;
      }
    }

    // Build success message
    const parts: string[] = [];
    if (updatedCount > 0) parts.push(`${updatedCount} updated`);
    if (newCount > 0) parts.push(`${newCount} new`);
    if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
    if (deletedCount > 0) parts.push(`${deletedCount} deleted`);

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
