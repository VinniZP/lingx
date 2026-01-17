import chalk from 'chalk';
import { Command } from 'commander';
import { join } from 'path';
import { createApiClientFromConfig } from '../../lib/api.js';
import { loadConfig } from '../../lib/config.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';
import { regenerateTypesIfEnabled } from '../types.js';
import {
  createKeyRemote,
  extractLanguageValues,
  getProjectLanguages,
  keyExists,
  parseKeyArgument,
  resolveBranchId,
  writeKeyValue,
} from './utils.js';

interface AddOptions {
  namespace?: string;
  value?: string;
  push?: boolean;
  project?: string;
  space?: string;
  branch?: string;
  overwrite?: boolean;
}

export function createKeyAddCommand(): Command {
  const cmd = new Command('add')
    .description('Add a new translation key to local files')
    .argument('<key>', 'Key name (supports namespace:key format)')
    .option('-n, --namespace <ns>', 'Namespace for the key')
    .option('-v, --value <value>', 'Default value for all languages')
    .option('--push', 'Push changes to remote API')
    .option('-p, --project <slug>', 'Project slug (for --push)')
    .option('-s, --space <slug>', 'Space slug (for --push)')
    .option('-b, --branch <name>', 'Branch name (for --push)')
    .option('-o, --overwrite', 'Overwrite existing values')
    .addHelpText(
      'afterAll',
      'You can also specify language-specific values using --lang <lang> <value>. Example: --en "Hello" --de "Hallo"'
    )
    .allowUnknownOption(true) // Allow dynamic --lang options
    .allowExcessArguments(true) // Allow extra args from unknown options
    .action(async (keyArg: string, options: AddOptions) => {
      try {
        // Extract language values from process.argv (--en "Hello" --de "Hallo")
        const langValues = extractLanguageValues(process.argv);
        await add(keyArg, options, langValues);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to add key');
        process.exit(1);
      }
    });

  return cmd;
}

async function add(
  keyArg: string,
  options: AddOptions,
  langValues: Record<string, string>
): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Parse the key argument
  const parsedKey = parseKeyArgument(keyArg, options.namespace);

  const translationsPath = join(cwd, config.paths.translations);

  // Check if key already exists
  const exists = await keyExists(translationsPath, parsedKey, config);
  if (exists && !options.overwrite) {
    throw new Error(`Key "${parsedKey.userKey}" already exists`);
  }

  // Get all languages in the project
  const languages = await getProjectLanguages(
    translationsPath,
    config.format.type,
    config.pull.filePattern
  );

  if (languages.length === 0) {
    throw new Error(
      `No translation files found in "${config.paths.translations}". Run "lingx pull" first or create translation files.`
    );
  }

  // Merge language-specific values with default value
  const values: Record<string, string> = {};
  for (const lang of languages) {
    if (langValues[lang] !== undefined) {
      values[lang] = langValues[lang];
    } else if (options.value !== undefined) {
      values[lang] = options.value;
    } else {
      values[lang] = ''; // Empty string for languages without value
    }
  }

  const spinner = createSpinner(`Adding key "${parsedKey.userKey}"...`);
  spinner.start();

  try {
    // Write to all language files
    for (const lang of languages) {
      await writeKeyValue(translationsPath, parsedKey, lang, values[lang], config);
    }

    spinner.succeed(
      `Added key "${chalk.cyan(parsedKey.userKey)}" to ${chalk.yellow(languages.length)} language(s)`
    );

    // Show values that were set
    const setLanguages = Object.entries(values)
      .filter(([, v]) => v !== '')
      .map(([lang]) => lang);
    if (setLanguages.length > 0) {
      logger.info(`Values set for: ${setLanguages.join(', ')}`);
    }

    // Regenerate types
    await regenerateTypesIfEnabled(cwd);

    // Push to API if requested
    if (options.push) {
      await pushToApi(parsedKey, values, options, config, cwd);
    }
  } catch (error) {
    spinner.fail('Failed to add key');
    throw error;
  }
}

async function pushToApi(
  parsedKey: ReturnType<typeof parseKeyArgument>,
  values: Record<string, string>,
  options: AddOptions,
  config: Awaited<ReturnType<typeof loadConfig>>,
  cwd: string
): Promise<void> {
  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const branch = options.branch ?? config.defaultBranch;

  if (!project) {
    throw new Error('Project is required for --push. Use -p or set in config.');
  }
  if (!space) {
    throw new Error('Space is required for --push. Use -s or set in config.');
  }

  const spinner = createSpinner('Pushing to API...');
  spinner.start();

  try {
    const client = await createApiClientFromConfig(cwd);
    const { branchId } = await resolveBranchId(client, project, space, branch);

    // Filter out empty values for API
    const nonEmptyValues = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''));

    await createKeyRemote(client, branchId, parsedKey.key, parsedKey.namespace, nonEmptyValues);

    spinner.succeed(`Pushed key "${chalk.cyan(parsedKey.userKey)}" to API`);
  } catch (error) {
    spinner.fail('Failed to push to API');
    throw error;
  }
}
