import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join, relative } from 'path';
import { glob } from 'glob';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { createExtractor, type ExtractionError } from '../lib/extractor/index.js';
import { parseNamespacedKey, toUserKey } from '@lingx/shared';
import {
  validateTranslations,
  summarizeValidation,
} from '../lib/validator/icu-validator.js';
import { runBatchQualityChecks, type BatchTranslationEntry } from '@lingx/shared';
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
  quality?: boolean;
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
    .option('--quality', 'Check translation quality (placeholders, whitespace, punctuation)')
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
  const noOptionsProvided = !options.missing && !options.unused && !options.validateIcu && !options.quality;
  const checkMissing = options.missing ?? noOptionsProvided;
  const checkUnused = options.unused ?? noOptionsProvided;
  const checkIcu = options.validateIcu ?? false;
  const checkQuality = options.quality ?? false;

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
      markerFunctions: config.extract.markerFunctions,
    });

    const codeKeys = new Set<string>();
    const allErrors: ExtractionError[] = [];

    for (const file of files) {
      const code = await readFile(file, 'utf-8');
      const result = extractor.extract(code, file);
      result.keys.forEach(k => codeKeys.add(k.key));
      allErrors.push(...result.errors);
    }

    // If there are extraction errors (dynamic keys), abort and show them
    if (allErrors.length > 0) {
      spinner.fail('Extraction failed');
      console.log();
      console.log(chalk.red.bold('ERROR: Dynamic keys detected - extraction aborted'));
      console.log();
      console.log(chalk.red(`Dynamic keys found (${allErrors.length}):`));

      for (const error of allErrors) {
        const relativePath = relative(cwd, error.location.file);
        console.log(`  ${chalk.gray(`${relativePath}:${error.location.line}`)}`);
        console.log(`    ${chalk.red('✗')} ${error.code ?? error.message}`);
        console.log(`      ${chalk.yellow(error.message)}`);
      }

      console.log();
      console.log(chalk.yellow('Fix all dynamic keys before running check.'));
      console.log(chalk.gray('Use tKey() to wrap dynamic keys or @lingx-key comments to declare them.'));
      return 1;
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

    // Helper to display keys in user-friendly format (namespace:key instead of delimiter)
    const displayKey = (key: string): string => {
      const { namespace, key: keyName } = parseNamespacedKey(key);
      return toUserKey(namespace, keyName);
    };

    // Check for missing keys (in code but not platform)
    if (checkMissing) {
      const missing = [...codeKeys].filter(k => !platformKeys.has(k));

      if (missing.length > 0) {
        hasErrors = true;
        console.log(chalk.red(`Missing keys (${missing.length}):`));
        console.log(chalk.gray('Keys in code but not in platform:'));
        console.log();
        for (const key of missing.sort()) {
          console.log(`  ${chalk.yellow('!')} ${displayKey(key)}`);
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
          console.log(`  ${chalk.gray('-')} ${displayKey(key)}`);
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

    // Quality checks (placeholders, whitespace, punctuation)
    if (checkQuality) {
      console.log(chalk.bold('Quality Checks'));
      console.log();

      // Determine source language (first language or 'en' if available)
      const sourceLanguage = response.languages.includes('en') ? 'en' : response.languages[0];

      if (!sourceLanguage) {
        console.log(chalk.yellow('No source language available for quality checks'));
        console.log();
      } else {
        // Build batch translation entries - group by key
        const sourceTranslations = response.translations[sourceLanguage] ?? {};

        // Get all unique keys
        const allKeys = new Set<string>();
        for (const translations of Object.values(response.translations)) {
          for (const key of Object.keys(translations)) {
            allKeys.add(key);
          }
        }

        const batchEntries: BatchTranslationEntry[] = [];
        for (const keyName of allKeys) {
          const sourceText = sourceTranslations[keyName];
          if (!sourceText) continue; // Skip keys without source text

          // Collect translations for this key
          const translations: Record<string, string> = {};
          for (const [lang, langTranslations] of Object.entries(response.translations)) {
            if (langTranslations[keyName]) {
              translations[lang] = langTranslations[keyName];
            }
          }

          batchEntries.push({
            keyName,
            sourceText,
            translations,
          });
        }

        // Run quality checks
        const qualityResults = runBatchQualityChecks(batchEntries, sourceLanguage);

        // Filter to only entries with issues
        const issuesFound = qualityResults.filter(r => r.result.issues.length > 0);

        if (issuesFound.length > 0) {
          // Group by key for cleaner output
          const byKey = new Map<string, typeof issuesFound>();
          for (const entry of issuesFound) {
            const existing = byKey.get(entry.keyName) ?? [];
            existing.push(entry);
            byKey.set(entry.keyName, existing);
          }

          let errorCount = 0;
          let warningCount = 0;

          for (const [key, entries] of byKey) {
            console.log(`  ${chalk.cyan(key)}`);
            for (const entry of entries) {
              for (const issue of entry.result.issues) {
                const icon = issue.severity === 'error' ? chalk.red('✗') : chalk.yellow('~');
                const severity = issue.severity === 'error' ? chalk.red : chalk.yellow;
                console.log(`    ${icon} ${chalk.gray(`[${entry.language}]`)} ${severity(issue.message)}`);

                if (issue.severity === 'error') errorCount++;
                else warningCount++;
              }
            }
          }

          console.log();

          const parts = [];
          if (errorCount > 0) parts.push(chalk.red(`${errorCount} error(s)`));
          if (warningCount > 0) parts.push(chalk.yellow(`${warningCount} warning(s)`));
          console.log(`Found ${parts.join(', ')} in ${byKey.size} key(s)`);
          console.log();

          if (errorCount > 0) {
            hasErrors = true;
          }
        } else {
          console.log(chalk.green('All translations passed quality checks'));
          console.log();
        }
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
