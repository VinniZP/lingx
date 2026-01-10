import { parseNamespacedKey, type CliTranslationsResponse } from '@lingx/shared';
import { Command } from 'commander';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { createFormatter } from '../lib/formatter/index.js';
import { readTranslationFilesWithNamespaces, writeTranslationFile } from '../lib/translation-io.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import { regenerateTypesIfEnabled } from './types.js';

interface PullOptions {
  project?: string;
  space?: string;
  branch?: string;
  format?: 'json' | 'yaml';
  output?: string;
  lang?: string;
}

export function createPullCommand(): Command {
  return new Command('pull')
    .description('Download translations to local files')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .option('-b, --branch <name>', 'Branch name')
    .option('-f, --format <type>', 'Output format: json or yaml')
    .option('-o, --output <dir>', 'Output directory')
    .option('-l, --lang <code>', 'Language code (default: all)')
    .action(async (options: PullOptions) => {
      try {
        await pull(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Pull failed');
        process.exit(1);
      }
    });
}

async function pull(options: PullOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Resolve options with config defaults
  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const branch = options.branch ?? config.defaultBranch;
  const format = options.format ?? config.format.type;
  const outputDir = options.output ?? config.paths.translations;

  if (!project) {
    throw new Error('Project is required. Use --project or set in config file.');
  }
  if (!space) {
    throw new Error('Space is required. Use --space or set defaultSpace in config file.');
  }

  const spinner = createSpinner('Fetching translations...');
  spinner.start();

  try {
    const client = await createApiClientFromConfig(cwd);

    // Get branch ID from space
    const spaces = await client.get<{
      spaces: { id: string; slug: string; branches: { id: string; name: string }[] }[];
    }>(`/api/projects/${project}/spaces`);

    const targetSpace = spaces.spaces.find((s) => s.slug === space);
    if (!targetSpace) {
      throw new Error(`Space "${space}" not found in project "${project}"`);
    }

    // Find branch in space
    const spaceDetails = await client.get<{ branches: { id: string; name: string }[] }>(
      `/api/spaces/${targetSpace.id}`
    );

    const targetBranch = spaceDetails.branches.find((b) => b.name === branch);
    if (!targetBranch) {
      throw new Error(`Branch "${branch}" not found in space "${space}"`);
    }

    // Fetch all translations for the branch
    const response = await client.get<CliTranslationsResponse>(
      `/api/branches/${targetBranch.id}/translations`
    );

    // Create formatter
    const formatter = createFormatter(format, {
      nested: config.format.nested,
      indentation: config.format.indentation,
    });

    // Absolute output directory
    const absOutputDir = join(cwd, outputDir);

    // Read existing local translations to preserve non-empty values
    spinner.text = 'Reading local translations...';
    let localTranslations: Record<string, Record<string, string>> = {};
    try {
      localTranslations = await readTranslationFilesWithNamespaces(
        absOutputDir,
        format,
        formatter,
        config.pull.filePattern
      );
    } catch {
      // No local files yet, that's fine
    }

    spinner.text = 'Writing translation files...';

    // Filter languages if specified
    const languages = options.lang
      ? [options.lang]
      : config.pull.languages.length > 0
        ? config.pull.languages
        : response.languages;

    // Write translation files, split by namespace
    let filesWritten = 0;
    let preservedCount = 0;
    const namespaceSummary = new Map<string | null, number>();

    for (const lang of languages) {
      const serverTranslations = response.translations[lang] ?? {};
      const localLangTranslations = localTranslations[lang] ?? {};

      // Merge server with local, preserving non-empty local values when server is empty
      const allTranslations: Record<string, string> = {};

      // First, add all server translations
      for (const [key, serverValue] of Object.entries(serverTranslations)) {
        const localValue = localLangTranslations[key] ?? '';

        // Server empty, local has value → preserve local
        if (serverValue === '' && localValue !== '') {
          allTranslations[key] = localValue;
          preservedCount++;
        } else {
          // Server has value (or both empty) → use server
          allTranslations[key] = serverValue;
        }
      }

      if (Object.keys(allTranslations).length === 0) {
        continue;
      }

      // Group translations by namespace
      const byNamespace = new Map<string | null, Record<string, string>>();
      for (const [combinedKey, value] of Object.entries(allTranslations)) {
        const { namespace, key } = parseNamespacedKey(combinedKey);
        if (!byNamespace.has(namespace)) {
          byNamespace.set(namespace, {});
        }
        byNamespace.get(namespace)![key] = value;
      }

      // Write files for each namespace
      for (const [namespace, translations] of byNamespace) {
        if (Object.keys(translations).length === 0) {
          continue;
        }

        // Determine file path based on namespace
        const fileName =
          config.pull.filePattern.replace('{lang}', lang) || `${lang}${formatter.extension}`;
        const filePath = namespace
          ? join(absOutputDir, namespace, fileName)
          : join(absOutputDir, fileName);

        // Ensure directory exists for namespaced files
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeTranslationFile(filePath, translations, formatter);
        filesWritten++;

        // Track namespace summary
        const currentCount = namespaceSummary.get(namespace) ?? 0;
        namespaceSummary.set(namespace, currentCount + Object.keys(translations).length);
      }
    }

    const preserved = preservedCount > 0 ? ` (${preservedCount} local values preserved)` : '';
    spinner.succeed(`Downloaded ${filesWritten} translation file(s) to ${outputDir}${preserved}`);

    // Show summary by namespace
    for (const [namespace, keyCount] of namespaceSummary) {
      const nsLabel = namespace ?? '(root)';
      logger.info(`  ${nsLabel}: ${keyCount} keys`);
    }

    // Regenerate types if enabled
    await regenerateTypesIfEnabled(cwd);
  } catch (error) {
    spinner.fail('Failed to pull translations');
    throw error;
  }
}
