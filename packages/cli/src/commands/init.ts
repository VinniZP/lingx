import { Command } from 'commander';
import inquirer from 'inquirer';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { credentialStore } from '../lib/auth.js';
import { ApiClient, ApiError } from '../lib/api.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import { getConfigPath } from '../lib/config.js';

interface InitOptions {
  yes?: boolean;
  project?: string;
  space?: string;
  apiUrl?: string;
  format?: 'json' | 'yaml';
  framework?: 'nextjs' | 'angular' | 'none';
}

interface InitAnswers {
  apiUrl: string;
  project: string;
  space: string;
  format: 'json' | 'yaml';
  translationsPath: string;
  sourcePath: string;
  framework: 'nextjs' | 'angular' | 'none';
}

const DEFAULTS: InitAnswers = {
  apiUrl: 'http://localhost:3001',
  project: '',
  space: '',
  format: 'json',
  translationsPath: './locales',
  sourcePath: './src',
  framework: 'nextjs',
};

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize a LocaleFlow configuration file')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <name>', 'Default space')
    .option('--api-url <url>', 'API URL')
    .option('--format <type>', 'Translation format (json or yaml)')
    .option('--framework <name>', 'Framework (nextjs, angular, or none)')
    .action(async (options: InitOptions) => {
      try {
        await init(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Initialization failed');
        process.exit(1);
      }
    });
}

async function init(options: InitOptions): Promise<void> {
  const projectDir = process.cwd();

  // Check if config already exists
  const existingConfig = getConfigPath(projectDir);
  if (existingConfig) {
    if (options.yes) {
      logger.warn(`Overwriting existing config: ${existingConfig}`);
    } else {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Config file already exists at ${existingConfig}. Overwrite?`,
          default: false,
        },
      ]);
      if (!overwrite) {
        logger.info('Initialization cancelled');
        return;
      }
    }
  }

  // Check if user is logged in
  const credentials = credentialStore.getCredentials();
  const isLoggedIn = !!credentials;

  // Gather config values
  let answers: InitAnswers;

  if (options.yes) {
    // Use defaults and CLI options
    answers = {
      apiUrl: options.apiUrl ?? DEFAULTS.apiUrl,
      project: options.project ?? DEFAULTS.project,
      space: options.space ?? DEFAULTS.space,
      format: options.format ?? DEFAULTS.format,
      translationsPath: DEFAULTS.translationsPath,
      sourcePath: DEFAULTS.sourcePath,
      framework: options.framework ?? DEFAULTS.framework,
    };
  } else {
    // Interactive prompts
    answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL:',
        default: options.apiUrl ?? (isLoggedIn ? credentials.apiUrl : DEFAULTS.apiUrl),
      },
      {
        type: 'input',
        name: 'project',
        message: 'Project slug:',
        default: options.project ?? DEFAULTS.project,
        validate: (input: string) => {
          if (!input) {
            return 'Project slug is required';
          }
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Project slug must be lowercase alphanumeric with hyphens';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'space',
        message: 'Default space (optional):',
        default: options.space ?? DEFAULTS.space,
      },
      {
        type: 'list',
        name: 'format',
        message: 'Translation file format:',
        choices: ['json', 'yaml'],
        default: options.format ?? DEFAULTS.format,
      },
      {
        type: 'input',
        name: 'translationsPath',
        message: 'Translations directory:',
        default: DEFAULTS.translationsPath,
      },
      {
        type: 'input',
        name: 'sourcePath',
        message: 'Source code directory:',
        default: DEFAULTS.sourcePath,
      },
      {
        type: 'list',
        name: 'framework',
        message: 'Framework:',
        choices: [
          { name: 'Next.js', value: 'nextjs' },
          { name: 'Angular', value: 'angular' },
          { name: 'None / Other', value: 'none' },
        ],
        default: options.framework ?? DEFAULTS.framework,
      },
    ]);
  }

  // Validate project exists if logged in
  if (isLoggedIn && answers.project) {
    const spinner = createSpinner('Validating project...');
    spinner.start();

    try {
      const client = new ApiClient(credentials);
      await client.get(`/api/projects/${answers.project}`);
      spinner.succeed(`Project "${answers.project}" found`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        spinner.warn(`Project "${answers.project}" not found on server (you can create it later)`);
      } else {
        spinner.warn('Could not validate project (continuing anyway)');
      }
    }
  }

  // Generate config file content
  const configContent = generateConfigFile(answers);

  // Write config file
  const configPath = join(projectDir, 'localeflow.config.ts');
  await writeFile(configPath, configContent, 'utf-8');

  logger.success(`Created ${configPath}`);
  logger.info('');
  logger.info('Next steps:');
  if (!isLoggedIn) {
    logger.info('  1. Run "lf auth login" to authenticate');
    logger.info('  2. Run "lf pull" to download translations');
  } else {
    logger.info('  1. Run "lf pull" to download translations');
    logger.info('  2. Run "lf push" to upload new keys');
  }
}

function generateConfigFile(answers: InitAnswers): string {
  const fileExtension = answers.format === 'yaml' ? 'yaml' : 'json';
  const sourceGlobs =
    answers.framework === 'angular'
      ? [`${answers.sourcePath}/**/*.ts`, `${answers.sourcePath}/**/*.html`]
      : [`${answers.sourcePath}/**/*.tsx`, `${answers.sourcePath}/**/*.ts`];

  const extractFunctions =
    answers.framework === 'angular'
      ? ['translate', 'instant']
      : ['t', 'useTranslation'];

  // Build the config object as a string to maintain formatting
  return `import type { LocaleflowConfig } from '@localeflow/cli';

const config: LocaleflowConfig = {
  api: {
    url: '${answers.apiUrl}',
  },
  project: '${answers.project}',${answers.space ? `\n  defaultSpace: '${answers.space}',` : ''}
  defaultBranch: 'main',
  format: {
    type: '${answers.format}',
    nested: true,
    indentation: 2,
  },
  paths: {
    translations: '${answers.translationsPath}',
    source: '${answers.sourcePath}',
  },
  pull: {
    languages: [],
    filePattern: '{lang}.${fileExtension}',
  },
  push: {
    filePattern: '{lang}.${fileExtension}',
  },
  extract: {
    framework: '${answers.framework === 'none' ? 'nextjs' : answers.framework}',
    patterns: ${JSON.stringify(sourceGlobs)},
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
    functions: ${JSON.stringify(extractFunctions)},
  },
};

export default config;
`;
}
