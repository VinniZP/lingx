import { Command } from 'commander';
import { join } from 'path';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { createFormatter } from '../lib/formatter/index.js';
import { writeTranslationFile } from '../lib/translation-io.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';

interface PullOptions {
  project?: string;
  space?: string;
  branch?: string;
  format?: 'json' | 'yaml';
  output?: string;
  lang?: string;
}

interface TranslationResponse {
  translations: Record<string, Record<string, string>>;
  languages: string[];
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
    const spaces = await client.get<{ spaces: { id: string; slug: string; branches: { id: string; name: string }[] }[] }>(
      `/api/projects/${project}/spaces`
    );

    const targetSpace = spaces.spaces.find(s => s.slug === space);
    if (!targetSpace) {
      throw new Error(`Space "${space}" not found in project "${project}"`);
    }

    // Find branch in space
    const spaceDetails = await client.get<{ branches: { id: string; name: string }[] }>(
      `/api/spaces/${targetSpace.id}`
    );

    const targetBranch = spaceDetails.branches.find(b => b.name === branch);
    if (!targetBranch) {
      throw new Error(`Branch "${branch}" not found in space "${space}"`);
    }

    // Fetch all translations for the branch
    const response = await client.get<TranslationResponse>(
      `/api/branches/${targetBranch.id}/translations`
    );

    spinner.text = 'Writing translation files...';

    // Create formatter
    const formatter = createFormatter(format, {
      nested: config.format.nested,
      indentation: config.format.indentation,
    });

    // Absolute output directory
    const absOutputDir = join(cwd, outputDir);

    // Filter languages if specified
    const languages = options.lang
      ? [options.lang]
      : (config.pull.languages.length > 0 ? config.pull.languages : response.languages);

    // Write translation files
    let filesWritten = 0;
    for (const lang of languages) {
      const translations = response.translations[lang] ?? {};
      if (Object.keys(translations).length === 0) {
        continue;
      }

      const fileName = config.pull.filePattern.replace('{lang}', lang)
        || `${lang}${formatter.extension}`;
      const filePath = join(absOutputDir, fileName);

      await writeTranslationFile(filePath, translations, formatter);
      filesWritten++;
    }

    spinner.succeed(`Downloaded ${filesWritten} translation file(s) to ${outputDir}`);

    for (const lang of languages) {
      const translations = response.translations[lang] ?? {};
      const keyCount = Object.keys(translations).length;
      if (keyCount > 0) {
        logger.info(`  ${lang}: ${keyCount} keys`);
      }
    }
  } catch (error) {
    spinner.fail('Failed to pull translations');
    throw error;
  }
}
