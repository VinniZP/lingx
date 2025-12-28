import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import { glob } from 'glob';
import { loadConfig } from '../lib/config.js';
import { createExtractor, type ExtractedKey } from '../lib/extractor/index.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import chalk from 'chalk';

interface ExtractOptions {
  source?: string;
  format?: 'nextjs' | 'angular';
  output?: string;
  detectIcu?: boolean;
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
