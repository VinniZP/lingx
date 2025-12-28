import { Command } from 'commander';
import { join } from 'path';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { createFormatter } from '../lib/formatter/index.js';
import { readTranslationFiles } from '../lib/translation-io.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';

interface PushOptions {
  project?: string;
  space?: string;
  branch?: string;
  source?: string;
  format?: 'json' | 'yaml';
}

export function createPushCommand(): Command {
  return new Command('push')
    .description('Upload local translations to the platform')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .option('-b, --branch <name>', 'Branch name')
    .option('-S, --source <dir>', 'Source directory')
    .option('-f, --format <type>', 'File format: json or yaml')
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
    const allTranslations = await readTranslationFiles(
      absSourceDir,
      format,
      formatter,
      config.push.filePattern
    );

    const languages = Object.keys(allTranslations);
    if (languages.length === 0) {
      spinner.fail(`No ${format} files found in ${sourceDir}`);
      return;
    }

    spinner.text = 'Uploading translations...';

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

    // Push translations
    await client.put(`/api/branches/${targetBranch.id}/translations`, {
      translations: allTranslations,
    });

    let totalKeys = 0;
    for (const lang of languages) {
      totalKeys += Object.keys(allTranslations[lang]).length;
    }

    spinner.succeed(`Uploaded ${totalKeys} keys across ${languages.length} language(s)`);

    for (const lang of languages) {
      logger.info(`  ${lang}: ${Object.keys(allTranslations[lang]).length} keys`);
    }
  } catch (error) {
    spinner.fail('Failed to push translations');
    throw error;
  }
}
