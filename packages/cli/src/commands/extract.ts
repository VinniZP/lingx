import { combineKey, parseNamespacedKey } from '@lingx/shared';
import chalk from 'chalk';
import { Command } from 'commander';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
import { glob } from 'glob';
import { dirname, extname, join, relative } from 'path';
import { loadConfig } from '../lib/config.js';
import { createExtractor, type ExtractedKey } from '../lib/extractor/index.js';
import { createFormatter } from '../lib/formatter/index.js';
import { extractLanguageFromFilename } from '../lib/translation-io.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import { regenerateTypesIfEnabled } from './types.js';

interface ExtractOptions {
  source?: string;
  format?: 'nextjs' | 'angular';
  output?: string;
  detectIcu?: boolean;
  clean?: boolean;
  sync?: boolean;
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
    .option('--clean', 'Remove unused keys from all locale files')
    .option('--sync', 'Sync keys to all locale files (adds missing, removes unused)')
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
    const patterns = config.extract.patterns.map((p) => {
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
            const varNames =
              paramsStr.match(/(\w+)\s*:/g)?.map((v) => v.replace(':', '').trim()) ?? [];
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
    const uniqueKeys = [...new Map(allKeys.map((k) => [k.key, k])).values()];

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
        // Parse the combined key to get just the key name for display
        const { key: keyName } = parseNamespacedKey(key.key);
        const location = key.location
          ? chalk.gray(` (${relative(cwd, key.location.file)}:${key.location.line})`)
          : '';
        console.log(`  ${keyName}${location}`);

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
        keys: uniqueKeys.map((k) => ({
          key: k.key,
          namespace: k.namespace,
          location: k.location ? `${relative(cwd, k.location.file)}:${k.location.line}` : undefined,
          ...(detectIcu && k.icu ? { icu: k.icu } : {}),
        })),
      };
      await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');
      logger.info(`Results written to ${options.output}`);
    }

    // Clean unused keys from all locale files if requested
    if (options.clean) {
      await cleanUnusedKeys(cwd, config, uniqueKeys);
    }

    // Sync extracted keys to locale files if requested
    if (options.sync) {
      await syncExtractedKeys(cwd, config, uniqueKeys);
    }

    // Regenerate types if enabled
    await regenerateTypesIfEnabled(cwd);
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
 * Clean unused keys from all locale files.
 * Removes keys that exist in translation files but are not used in source code.
 */
async function cleanUnusedKeys(
  cwd: string,
  config: Awaited<ReturnType<typeof loadConfig>>,
  extractedKeys: ExtractedKeyWithIcu[]
): Promise<void> {
  const spinner = createSpinner('Cleaning unused keys from all locale files...');
  spinner.start();

  try {
    const localesDir = join(cwd, config.paths.translations);

    if (!existsSync(localesDir)) {
      spinner.warn(`Translations directory not found: ${localesDir}`);
      return;
    }

    // Create formatter
    const formatter = createFormatter(config.format.type, {
      nested: config.format.nested,
      indentation: config.format.indentation,
    });

    // Get extracted keys as a set (with namespace delimiter format)
    const usedKeys = new Set(extractedKeys.map((k) => k.key));

    // Track all removed keys by language
    const removedByLang: Record<string, string[]> = {};
    let totalRemoved = 0;
    let filesModified = 0;

    // Helper to clean a single file
    async function cleanFile(filePath: string, namespace: string | null): Promise<void> {
      if (!existsSync(filePath)) return;

      const relPath = relative(cwd, filePath);
      let content: string;
      let translations: Record<string, string>;

      try {
        content = await readFile(filePath, 'utf-8');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to read ${relPath}: ${message}`);
      }

      try {
        translations = formatter.parse(content);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse ${relPath}: ${message}`);
      }

      const lang = extractLanguageFromFilename(filePath, config.pull.filePattern);
      if (!lang) {
        logger.warn(`Could not determine language from file: ${relPath}`);
        return;
      }

      const cleanedTranslations: Record<string, string> = {};
      const removedKeys: string[] = [];

      for (const [key, value] of Object.entries(translations)) {
        // Construct the full key with namespace to match against extracted keys
        const fullKey = combineKey(namespace, key);

        if (usedKeys.has(fullKey)) {
          cleanedTranslations[key] = value;
        } else {
          removedKeys.push(namespace ? `${namespace}:${key}` : key);
        }
      }

      if (removedKeys.length > 0) {
        // Sort keys alphabetically for consistent output
        const sortedTranslations: Record<string, string> = {};
        for (const k of Object.keys(cleanedTranslations).sort()) {
          sortedTranslations[k] = cleanedTranslations[k];
        }

        const newContent = formatter.format(sortedTranslations);
        try {
          await writeFile(filePath, newContent + '\n', 'utf-8');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to write ${relPath}: ${message}`);
        }

        if (!removedByLang[lang]) {
          removedByLang[lang] = [];
        }
        removedByLang[lang].push(...removedKeys);
        totalRemoved += removedKeys.length;
        filesModified++;
      }
    }

    // Helper to process a directory (root or namespace subdirectory)
    async function processDirectory(dir: string, namespace: string | null): Promise<void> {
      if (!existsSync(dir)) return;

      const relDir = relative(cwd, dir) || '.';
      let files: string[];

      try {
        files = await readdir(dir);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to read directory ${relDir}: ${message}`);
      }

      for (const file of files) {
        const filePath = join(dir, file);
        let fileStat;

        try {
          fileStat = await stat(filePath);
        } catch (error) {
          // File may have been deleted between readdir and stat, skip it
          continue;
        }

        // Skip directories
        if (fileStat.isDirectory()) continue;

        const ext = extname(file).toLowerCase();
        const isJsonFile = config.format.type === 'json' && ext === '.json';
        const isYamlFile = config.format.type === 'yaml' && (ext === '.yaml' || ext === '.yml');

        if (isJsonFile || isYamlFile) {
          await cleanFile(filePath, namespace);
        }
      }
    }

    // Process root directory (non-namespaced keys)
    await processDirectory(localesDir, null);

    // Process namespace subdirectories
    const entries = await readdir(localesDir);
    for (const entry of entries) {
      const entryPath = join(localesDir, entry);
      let entryStat;

      try {
        entryStat = await stat(entryPath);
      } catch {
        // Entry may have been deleted, skip it
        continue;
      }

      // Process subdirectories as namespaces (exclude hidden directories)
      if (entryStat.isDirectory() && !entry.startsWith('.')) {
        await processDirectory(entryPath, entry);
      }
    }

    if (totalRemoved === 0) {
      spinner.succeed('No unused keys found');
      return;
    }

    spinner.succeed(`Removed ${totalRemoved} unused key(s) from ${filesModified} file(s)`);

    // Display removed keys grouped by language
    console.log();
    console.log(chalk.bold('Removed Keys by Language:'));
    for (const lang of Object.keys(removedByLang).sort()) {
      console.log(chalk.cyan(`  [${lang}]`));
      for (const key of removedByLang[lang].sort()) {
        console.log(chalk.red(`    - ${key}`));
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    spinner.fail(`Failed to clean unused keys: ${message}`);
    throw error;
  }
}

/**
 * Sync extracted keys to all locale files.
 * - Adds missing keys with empty values to all locales.
 * - Removes unused keys from all locales.
 *
 * File structure:
 * - locales/[lang].json - root keys (no namespace)
 * - locales/[namespace]/[lang].json - namespaced keys
 */
async function syncExtractedKeys(
  cwd: string,
  config: Awaited<ReturnType<typeof loadConfig>>,
  extractedKeys: ExtractedKeyWithIcu[]
): Promise<void> {
  const spinner = createSpinner('Syncing extracted keys to all locale files...');
  spinner.start();

  try {
    const localesDir = join(cwd, config.paths.translations);

    if (!existsSync(localesDir)) {
      spinner.warn(`Translations directory not found: ${localesDir}`);
      return;
    }

    // Group keys by namespace, extracting just the key part (without namespace prefix)
    const byNamespace = new Map<string | null, Set<string>>();
    for (const key of extractedKeys) {
      const { namespace, key: keyName } = parseNamespacedKey(key.key);
      const ns = namespace ?? null;

      if (!byNamespace.has(ns)) {
        byNamespace.set(ns, new Set());
      }
      byNamespace.get(ns)!.add(keyName);
    }

    // Create formatter
    const formatter = createFormatter(config.format.type, {
      nested: config.format.nested,
      indentation: config.format.indentation,
    });

    // Track statistics
    let filesModified = 0;
    let filesCreated = 0;
    const addedByLang: Record<string, number> = {};
    const removedByLang: Record<string, string[]> = {};

    // Helper to sync a single file
    async function syncFile(
      filePath: string,
      namespace: string | null,
      expectedKeys: Set<string>
    ): Promise<void> {
      const relPath = relative(cwd, filePath);
      const lang = extractLanguageFromFilename(filePath, config.pull.filePattern);
      if (!lang) {
        logger.warn(`Could not determine language from file: ${relPath}`);
        return;
      }

      const fileExists = existsSync(filePath);

      // Read existing translations or start empty
      let existingTranslations: Record<string, string> = {};
      if (fileExists) {
        let content: string;
        try {
          content = await readFile(filePath, 'utf-8');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to read ${relPath}: ${message}`);
        }

        try {
          existingTranslations = formatter.parse(content);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to parse ${relPath}: ${message}`);
        }
      }

      // Build synced translations
      const syncedTranslations: Record<string, string> = {};
      let added = 0;
      const removed: string[] = [];

      // Add all expected keys (with existing value or empty string for new)
      for (const keyName of expectedKeys) {
        syncedTranslations[keyName] = existingTranslations[keyName] ?? '';
        if (!(keyName in existingTranslations)) {
          added++;
        }
      }

      // Track removed keys
      for (const existingKey of Object.keys(existingTranslations)) {
        if (!expectedKeys.has(existingKey)) {
          const displayKey = namespace ? `${namespace}:${existingKey}` : existingKey;
          removed.push(displayKey);
        }
      }

      // Check if there are changes
      const hasChanges = added > 0 || removed.length > 0;
      if (!hasChanges && fileExists) {
        return; // No changes needed
      }

      // Sort keys alphabetically
      const sortedTranslations: Record<string, string> = {};
      for (const k of Object.keys(syncedTranslations).sort()) {
        sortedTranslations[k] = syncedTranslations[k];
      }

      // Ensure directory exists
      try {
        await mkdir(dirname(filePath), { recursive: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to create directory for ${relPath}: ${message}`);
      }

      // Write file
      try {
        const content = formatter.format(sortedTranslations);
        await writeFile(filePath, content + '\n', 'utf-8');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to write ${relPath}: ${message}`);
      }

      // Update statistics
      if (!fileExists) {
        filesCreated++;
      } else if (hasChanges) {
        filesModified++;
      }

      if (added > 0) {
        addedByLang[lang] = (addedByLang[lang] ?? 0) + added;
      }
      if (removed.length > 0) {
        if (!removedByLang[lang]) {
          removedByLang[lang] = [];
        }
        removedByLang[lang].push(...removed);
      }
    }

    // Helper to process a directory for all locale files
    async function processDirectory(dir: string, namespace: string | null): Promise<void> {
      if (!existsSync(dir)) return;

      const expectedKeys = byNamespace.get(namespace) ?? new Set();
      if (expectedKeys.size === 0 && namespace !== null) {
        // No keys for this namespace, skip
        return;
      }

      const relDir = relative(cwd, dir) || '.';
      let files: string[];

      try {
        files = await readdir(dir);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to read directory ${relDir}: ${message}`);
      }

      for (const file of files) {
        const filePath = join(dir, file);
        let fileStat;

        try {
          fileStat = await stat(filePath);
        } catch {
          // File may have been deleted between readdir and stat, skip it
          continue;
        }

        // Skip directories
        if (fileStat.isDirectory()) continue;

        const ext = extname(file).toLowerCase();
        const isJsonFile = config.format.type === 'json' && ext === '.json';
        const isYamlFile = config.format.type === 'yaml' && (ext === '.yaml' || ext === '.yml');

        if (isJsonFile || isYamlFile) {
          await syncFile(filePath, namespace, expectedKeys);
        }
      }
    }

    // Process root directory (non-namespaced keys)
    await processDirectory(localesDir, null);

    // Process namespace subdirectories
    const entries = await readdir(localesDir);
    for (const entry of entries) {
      const entryPath = join(localesDir, entry);
      let entryStat;

      try {
        entryStat = await stat(entryPath);
      } catch {
        // Entry may have been deleted, skip it
        continue;
      }

      if (entryStat.isDirectory() && !entry.startsWith('.')) {
        await processDirectory(entryPath, entry);
      }
    }

    // Build summary
    const totalAdded = Object.values(addedByLang).reduce((a, b) => a + b, 0);
    const totalRemoved = Object.values(removedByLang).reduce((a, b) => a + b.length, 0);

    const parts: string[] = [];
    if (totalAdded > 0) parts.push(`${totalAdded} added`);
    if (totalRemoved > 0) parts.push(`${totalRemoved} removed`);
    if (filesCreated > 0) parts.push(`${filesCreated} file(s) created`);
    if (filesModified > 0) parts.push(`${filesModified} file(s) modified`);

    if (parts.length > 0) {
      spinner.succeed(`Synced: ${parts.join(', ')}`);

      // Display added keys by language
      if (totalAdded > 0) {
        console.log();
        console.log(chalk.bold('Added Keys by Language:'));
        for (const lang of Object.keys(addedByLang).sort()) {
          console.log(chalk.green(`  [${lang}] ${addedByLang[lang]} key(s)`));
        }
      }

      // Display removed keys by language
      if (totalRemoved > 0) {
        console.log();
        console.log(chalk.bold('Removed Keys by Language:'));
        for (const lang of Object.keys(removedByLang).sort()) {
          console.log(chalk.cyan(`  [${lang}]`));
          for (const key of removedByLang[lang].sort()) {
            console.log(chalk.red(`    - ${key}`));
          }
        }
      }
    } else {
      spinner.succeed('All keys already synced');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    spinner.fail(`Failed to sync extracted keys: ${message}`);
    throw error;
  }
}
