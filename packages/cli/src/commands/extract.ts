import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import { existsSync } from 'fs';
import { glob } from 'glob';
import { loadConfig } from '../lib/config.js';
import { createExtractor, type ExtractedKey } from '../lib/extractor/index.js';
import { createFormatter } from '../lib/formatter/index.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import chalk from 'chalk';

interface ExtractOptions {
  source?: string;
  format?: 'nextjs' | 'angular';
  output?: string;
  detectIcu?: boolean;
  clean?: boolean;
  locale?: string;
}

interface ExtractedKeyWithIcu extends ExtractedKey {
  icu?: {
    variables: string[];
    patterns: string[];
  };
}

export function createExtractCommand(): Command {
  return new Command('extract')
    .description('Extract translation keys from source code')
    .option('-s, --source <dir>', 'Source directory to scan')
    .option('-f, --format <type>', 'Framework format: nextjs or angular')
    .option('-o, --output <file>', 'Output file for extracted keys (JSON)')
    .option('--detect-icu', 'Detect ICU MessageFormat variables in code')
    .option('--clean', 'Remove unused keys from locale file')
    .option('-l, --locale <file>', 'Locale file to clean (default: uses config)')
    .action(async (options: ExtractOptions) => {
      try {
        await extract(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Extract failed');
        process.exit(1);
      }
    });
}

async function extract(options: ExtractOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Resolve options with config defaults
  const sourceDir = options.source ?? config.paths.source;
  const framework = options.format ?? config.extract.framework;
  const detectIcu = options.detectIcu ?? false;

  const spinner = createSpinner('Scanning source files...');
  spinner.start();

  try {
    // Find files matching patterns
    const patterns = config.extract.patterns.map(p => {
      // Handle patterns that start with src/ when sourceDir is already ./src
      const patternPath = p.replace(/^src\//, '');
      return join(cwd, sourceDir, patternPath);
    });
    const excludePatterns = config.extract.exclude;

    let files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        ignore: excludePatterns,
        nodir: true,
      });
      files.push(...matches);
    }

    // Deduplicate files
    files = [...new Set(files)];

    if (files.length === 0) {
      spinner.warn('No source files found');
      return;
    }

    spinner.text = `Extracting keys from ${files.length} file(s)...`;

    // Create extractor
    const extractor = createExtractor(framework, {
      functions: config.extract.functions,
    });

    // Extract keys from all files
    const allKeys: ExtractedKeyWithIcu[] = [];

    for (const file of files) {
      const code = await readFile(file, 'utf-8');
      const keys = extractor.extractFromCodeWithDetails(code, file);

      // Detect ICU patterns if requested
      for (const key of keys) {
        const keyWithIcu: ExtractedKeyWithIcu = { ...key };

        if (detectIcu) {
          // Look for second argument (params object) which might contain ICU variable hints
          const escapedKey = escapeRegex(key.key.split(':').pop() ?? key.key);
          const paramsMatch = code.match(
            new RegExp(`t\\s*\\(\\s*['"\`]${escapedKey}['"\`]\\s*,\\s*\\{([^}]+)\\}`)
          );
          if (paramsMatch) {
            const paramsStr = paramsMatch[1];
            const varNames = paramsStr.match(/(\w+)\s*:/g)?.map(v => v.replace(':', '').trim()) ?? [];
            if (varNames.length > 0) {
              keyWithIcu.icu = {
                variables: varNames,
                patterns: [], // Would need translation content to detect patterns
              };
            }
          }
        }

        allKeys.push(keyWithIcu);
      }
    }

    // Deduplicate keys by key value
    const uniqueKeys = [...new Map(allKeys.map(k => [k.key, k])).values()];

    spinner.succeed(`Found ${uniqueKeys.length} unique key(s) in ${files.length} file(s)`);

    // Display results
    console.log();
    console.log(chalk.bold('Extracted Keys:'));
    console.log();

    // Group by namespace
    const byNamespace = new Map<string | undefined, ExtractedKeyWithIcu[]>();
    for (const key of uniqueKeys) {
      const ns = key.namespace;
      if (!byNamespace.has(ns)) {
        byNamespace.set(ns, []);
      }
      byNamespace.get(ns)!.push(key);
    }

    for (const [namespace, keys] of byNamespace) {
      if (namespace) {
        console.log(chalk.cyan(`[${namespace}]`));
      }
      for (const key of keys.sort((a, b) => a.key.localeCompare(b.key))) {
        const displayKey = namespace ? key.key.replace(`${namespace}:`, '') : key.key;
        const location = key.location
          ? chalk.gray(` (${relative(cwd, key.location.file)}:${key.location.line})`)
          : '';
        console.log(`  ${displayKey}${location}`);

        if (detectIcu && key.icu && key.icu.variables.length > 0) {
          console.log(chalk.gray(`    Variables: ${key.icu.variables.join(', ')}`));
        }
      }
      console.log();
    }

    // Write output file if requested
    if (options.output) {
      const outputPath = join(cwd, options.output);
      const output = {
        extractedAt: new Date().toISOString(),
        framework,
        sourceDir,
        totalKeys: uniqueKeys.length,
        keys: uniqueKeys.map(k => ({
          key: k.key,
          namespace: k.namespace,
          location: k.location
            ? `${relative(cwd, k.location.file)}:${k.location.line}`
            : undefined,
          ...(detectIcu && k.icu ? { icu: k.icu } : {}),
        })),
      };
      await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');
      logger.info(`Results written to ${options.output}`);
    }

    // Clean unused keys from locale file if requested
    if (options.clean) {
      await cleanUnusedKeys(cwd, config, uniqueKeys, options.locale);
    }
  } catch (error) {
    spinner.fail('Extraction failed');
    throw error;
  }
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clean unused keys from locale file.
 */
async function cleanUnusedKeys(
  cwd: string,
  config: Awaited<ReturnType<typeof loadConfig>>,
  extractedKeys: ExtractedKeyWithIcu[],
  localeFile?: string
): Promise<void> {
  const spinner = createSpinner('Cleaning unused keys...');
  spinner.start();

  try {
    // Determine locale file path
    const localePath = localeFile
      ? join(cwd, localeFile)
      : join(cwd, config.paths.translations, config.pull.filePattern.replace('{lang}', 'en'));

    if (!existsSync(localePath)) {
      spinner.warn(`Locale file not found: ${localePath}`);
      return;
    }

    // Create formatter
    const formatter = createFormatter(config.format.type, {
      nested: config.format.nested,
      indentation: config.format.indentation,
    });

    // Read existing locale file
    const content = await readFile(localePath, 'utf-8');
    const existingTranslations = formatter.parse(content);
    const existingKeys = new Set(Object.keys(existingTranslations));

    // Get extracted keys as a set
    const usedKeys = new Set(extractedKeys.map(k => k.key));

    // Find unused keys
    const unusedKeys: string[] = [];
    for (const key of existingKeys) {
      if (!usedKeys.has(key)) {
        unusedKeys.push(key);
      }
    }

    if (unusedKeys.length === 0) {
      spinner.succeed('No unused keys found');
      return;
    }

    // Remove unused keys
    const cleanedTranslations: Record<string, string> = {};
    for (const [key, value] of Object.entries(existingTranslations)) {
      if (usedKeys.has(key)) {
        cleanedTranslations[key] = value;
      }
    }

    // Write back
    const newContent = formatter.format(cleanedTranslations);
    await writeFile(localePath, newContent + '\n', 'utf-8');

    spinner.succeed(`Removed ${unusedKeys.length} unused key(s) from ${relative(cwd, localePath)}`);

    // Display removed keys
    console.log();
    console.log(chalk.bold('Removed Keys:'));
    for (const key of unusedKeys.sort()) {
      console.log(chalk.red(`  - ${key}`));
    }
  } catch (error) {
    spinner.fail('Failed to clean unused keys');
    throw error;
  }
}
