import { readFile, writeFile, readdir, mkdir, stat } from 'fs/promises';
import { join, basename, extname, dirname } from 'path';
import { existsSync } from 'fs';
import { combineKey } from '@lingx/shared';
import type { Formatter } from './formatter/index.js';

/**
 * Extract language code from a filename using a pattern.
 * Pattern should contain {lang} placeholder.
 * Examples:
 *   - extractLanguageFromFilename('en.json', '{lang}.json') => 'en'
 *   - extractLanguageFromFilename('messages-de.json', 'messages-{lang}.json') => 'de'
 */
export function extractLanguageFromFilename(filename: string, pattern: string): string {
  const langPlaceholder = '{lang}';

  // Get just the filename without any path
  const name = basename(filename);

  // Get pattern without directory parts
  const patternFilename = basename(pattern);

  const patternParts = patternFilename.split(langPlaceholder);

  if (patternParts.length !== 2) {
    // Fall back to using filename without extension
    return basename(name, extname(name));
  }

  const [prefix, suffix] = patternParts;

  if (name.startsWith(prefix) && name.endsWith(suffix)) {
    return name.slice(prefix.length, name.length - suffix.length);
  }

  return basename(name, extname(name));
}

/**
 * Write translations to a file using the specified formatter.
 * Creates parent directories if they don't exist.
 */
export async function writeTranslationFile(
  filePath: string,
  translations: Record<string, string>,
  formatter: Formatter
): Promise<void> {
  // Ensure directory exists (recursive: true is idempotent)
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });

  const content = formatter.format(translations);
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Read all translation files from a directory.
 * Returns a map of language code to translations.
 */
export async function readTranslationFiles(
  directory: string,
  format: 'json' | 'yaml',
  formatter: Formatter,
  filePattern: string
): Promise<Record<string, Record<string, string>>> {
  if (!existsSync(directory)) {
    return {};
  }

  const files = await readdir(directory);
  const result: Record<string, Record<string, string>> = {};

  for (const file of files) {
    const ext = extname(file).toLowerCase();

    // Check if file extension matches the format
    const isJsonFile = format === 'json' && ext === '.json';
    const isYamlFile = format === 'yaml' && (ext === '.yaml' || ext === '.yml');

    if (!isJsonFile && !isYamlFile) {
      continue;
    }

    const filePath = join(directory, file);
    const content = await readFile(filePath, 'utf-8');
    const translations = formatter.parse(content);

    // Extract language from filename
    const lang = extractLanguageFromFilename(file, filePattern);
    result[lang] = translations;
  }

  return result;
}

/**
 * Read all translation files from a directory and its namespace subdirectories.
 * Returns translations with namespace delimiter format for namespaced keys.
 *
 * File structure:
 * - directory/[lang].json - root keys (no namespace)
 * - directory/[namespace]/[lang].json - namespaced keys
 *
 * Keys are combined as: namespace␟key for namespaced, or just key for root
 */
export async function readTranslationFilesWithNamespaces(
  directory: string,
  format: 'json' | 'yaml',
  formatter: Formatter,
  filePattern: string
): Promise<Record<string, Record<string, string>>> {
  if (!existsSync(directory)) {
    return {};
  }

  const result: Record<string, Record<string, string>> = {};

  // Helper to process a directory (root or namespace)
  async function processDirectory(dir: string, namespace: string | null) {
    if (!existsSync(dir)) {
      return;
    }

    const files = await readdir(dir);

    for (const file of files) {
      const filePath = join(dir, file);
      const fileStat = await stat(filePath);

      // Skip directories at this level (we'll process namespaces separately)
      if (fileStat.isDirectory()) {
        continue;
      }

      const ext = extname(file).toLowerCase();

      // Check if file extension matches the format
      const isJsonFile = format === 'json' && ext === '.json';
      const isYamlFile = format === 'yaml' && (ext === '.yaml' || ext === '.yml');

      if (!isJsonFile && !isYamlFile) {
        continue;
      }

      const content = await readFile(filePath, 'utf-8');
      const translations = formatter.parse(content);

      // Extract language from filename
      const lang = extractLanguageFromFilename(file, filePattern);

      // Initialize language object if needed
      if (!result[lang]) {
        result[lang] = {};
      }

      // Add translations with namespace prefix if applicable
      for (const [key, value] of Object.entries(translations)) {
        const combinedKey = combineKey(namespace, key);
        result[lang][combinedKey] = value;
      }
    }
  }

  // Process root directory
  await processDirectory(directory, null);

  // Process namespace subdirectories
  const entries = await readdir(directory);
  for (const entry of entries) {
    const entryPath = join(directory, entry);
    const entryStat = await stat(entryPath);

    // Process subdirectories as namespaces (exclude hidden directories)
    if (entryStat.isDirectory() && !entry.startsWith('.')) {
      await processDirectory(entryPath, entry);
    }
  }

  return result;
}

/**
 * Compute the diff between local and remote translations.
 */
export interface TranslationDiff {
  localOnly: { lang: string; key: string; value: string }[];
  remoteOnly: { lang: string; key: string; value: string }[];
  conflicts: { lang: string; key: string; localValue: string; remoteValue: string }[];
}

export function computeTranslationDiff(
  local: Record<string, Record<string, string>>,
  remote: Record<string, Record<string, string>>
): TranslationDiff {
  const localOnly: TranslationDiff['localOnly'] = [];
  const remoteOnly: TranslationDiff['remoteOnly'] = [];
  const conflicts: TranslationDiff['conflicts'] = [];

  const allLanguages = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const lang of allLanguages) {
    const localTrans = local[lang] ?? {};
    const remoteTrans = remote[lang] ?? {};

    const allKeys = new Set([...Object.keys(localTrans), ...Object.keys(remoteTrans)]);

    for (const key of allKeys) {
      const localValue = localTrans[key];
      const remoteValue = remoteTrans[key];

      // Check for key existence (not truthiness - empty strings are valid values)
      const hasLocal = localValue !== undefined;
      const hasRemote = remoteValue !== undefined;

      if (hasLocal && !hasRemote) {
        localOnly.push({ lang, key, value: localValue });
      } else if (!hasLocal && hasRemote) {
        remoteOnly.push({ lang, key, value: remoteValue });
      } else if (hasLocal && hasRemote && localValue !== remoteValue) {
        conflicts.push({ lang, key, localValue, remoteValue });
      }
    }
  }

  return { localOnly, remoteOnly, conflicts };
}
