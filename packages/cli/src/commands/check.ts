import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { createExtractor } from '../lib/extractor/index.js';
import {
  validateTranslations,
  summarizeValidation,
} from '../lib/validator/icu-validator.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import chalk from 'chalk';

interface CheckOptions {
  project?: string;
  space?: string;
  branch?: string;
  source?: string;
  missing?: boolean;
  unused?: boolean;
  validateIcu?: boolean;
}

interface TranslationResponse {
  translations: Record<string, Record<string, string>>;
  languages: string[];
}

/**
 * Creates the check command for validating translation coverage and ICU syntax.
 */
export function createCheckCommand(): Command {
  return new Command('check')
    .description('Check translation coverage and validate ICU syntax')
    .option('-p, --project <slug>', 'Project slug')
    .option('-S, --space <slug>', 'Space slug')
    .option('-b, --branch <name>', 'Branch name')
    .option('-s, --source <dir>', 'Source directory')
    .option('--missing', 'Show keys in code but not in platform')
    .option('--unused', 'Show keys in platform but not in code')
    .option('--validate-icu', 'Validate ICU MessageFormat syntax')
    .action(async (options: CheckOptions) => {
      try {
        const exitCode = await check(options);
        process.exit(exitCode);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Check failed');
        process.exit(1);
      }
    });
}

/**
 * Executes the check operation.
 *
 * @param options - Check command options
 * @returns Exit code (0 for success, 1 for errors)
 */
async function check(options: CheckOptions): Promise<number> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Resolve options with config defaults
  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const branch = options.branch ?? config.defaultBranch;
  const sourceDir = options.source ?? config.paths.source;

  // Default behavior: check everything if no specific option is provided
  const noOptionsProvided = !options.missing && !options.unused && !options.validateIcu;
  const checkMissing = options.missing ?? noOptionsProvided;
  const checkUnused = options.unused ?? noOptionsProvided;
  const checkIcu = options.validateIcu ?? false;

  if (!project) {
    throw new Error('Project is required. Use --project or set in config file.');
  }
  if (!space) {
    throw new Error('Space is required. Use --space or set defaultSpace in config file.');
  }

  const spinner = createSpinner('Analyzing...');
  spinner.start();

  let hasErrors = false;

  try {
    // Extract keys from code
    spinner.text = 'Extracting keys from source code...';

    const patterns = config.extract.patterns.map(p => {
      // Handle patterns that start with src/ when sourceDir is already ./src
      const patternPath = p.replace(/^src\//, '');
      return join(cwd, sourceDir, patternPath);
    });

    let files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        ignore: config.extract.exclude,
        nodir: true,
      });
      files.push(...matches);
    }
    files = [...new Set(files)];

    const extractor = createExtractor(config.extract.framework, {
      functions: config.extract.functions,
    });

    const codeKeys = new Set<string>();
    for (const file of files) {
      const code = await readFile(file, 'utf-8');
      const keys = extractor.extractFromCode(code, file);
      keys.forEach(k => codeKeys.add(k));
    }

    // Fetch remote translations
    spinner.text = 'Fetching translations from platform...';

    const client = await createApiClientFromConfig(cwd);

    // Get spaces for project
    const spaces = await client.get<{ spaces: { id: string; slug: string }[] }>(
      `/api/projects/${project}/spaces`
    );

    const targetSpace = spaces.spaces.find(s => s.slug === space);
    if (!targetSpace) {
      throw new Error(`Space "${space}" not found in project "${project}"`);
    }

    // Get branches for space
    const spaceDetails = await client.get<{ branches: { id: string; name: string }[] }>(
      `/api/spaces/${targetSpace.id}`
    );

    const targetBranch = spaceDetails.branches.find(b => b.name === branch);
    if (!targetBranch) {
      throw new Error(`Branch "${branch}" not found in space "${space}"`);
    }

    // Fetch translations
    const response = await client.get<TranslationResponse>(
      `/api/branches/${targetBranch.id}/translations`
    );

    // Get all platform keys
    const platformKeys = new Set<string>();
    for (const translations of Object.values(response.translations)) {
      for (const key of Object.keys(translations)) {
        platformKeys.add(key);
      }
    }

    spinner.stop();

    console.log();
    console.log(chalk.bold('Translation Check Report'));
    console.log(chalk.gray('-'.repeat(50)));
    console.log();
    console.log(`Code keys:     ${codeKeys.size}`);
    console.log(`Platform keys: ${platformKeys.size}`);
    console.log();

    // Check for missing keys (in code but not platform)
    if (checkMissing) {
      const missing = [...codeKeys].filter(k => !platformKeys.has(k));

      if (missing.length > 0) {
        hasErrors = true;
        console.log(chalk.red(`Missing keys (${missing.length}):`));
        console.log(chalk.gray('Keys in code but not in platform:'));
        console.log();
        for (const key of missing.sort()) {
          console.log(`  ${chalk.yellow('!')} ${key}`);
        }
        console.log();
      } else {
        console.log(chalk.green('No missing keys'));
        console.log();
      }
    }

    // Check for unused keys (in platform but not code)
    if (checkUnused) {
      const unused = [...platformKeys].filter(k => !codeKeys.has(k));

      if (unused.length > 0) {
        // Unused is a warning, not an error
        console.log(chalk.yellow(`Unused keys (${unused.length}):`));
        console.log(chalk.gray('Keys in platform but not in code:'));
        console.log();
        for (const key of unused.sort()) {
          console.log(`  ${chalk.gray('-')} ${key}`);
        }
        console.log();
      } else {
        console.log(chalk.green('No unused keys'));
        console.log();
      }
    }

    // Validate ICU syntax
    if (checkIcu) {
      console.log(chalk.bold('ICU MessageFormat Validation'));
      console.log();

      let totalErrors = 0;

      for (const [lang, translations] of Object.entries(response.translations)) {
        const results = validateTranslations(translations);
        const summary = summarizeValidation(results);

        if (summary.invalid > 0) {
          hasErrors = true;
          totalErrors += summary.invalid;
          console.log(chalk.red(`[${lang}] ${summary.invalid} error(s):`));

          for (const { key, errors } of summary.errors) {
            console.log(`  ${chalk.yellow(key)}`);
            for (const error of errors) {
              console.log(`    ${chalk.red('!')} ${error.message}`);
            }
          }
          console.log();
        } else {
          console.log(chalk.green(`[${lang}] All ${summary.total} translations valid`));
        }
      }

      if (totalErrors === 0) {
        console.log();
        console.log(chalk.green('All ICU MessageFormat syntax is valid'));
      }
    }

    // Summary
    console.log(chalk.gray('-'.repeat(50)));
    if (hasErrors) {
      console.log(chalk.red('Check failed - issues found'));
      return 1;
    } else {
      console.log(chalk.green('Check passed - no issues found'));
      return 0;
    }
  } catch (error) {
    spinner.fail('Check failed');
    throw error;
  }
}
