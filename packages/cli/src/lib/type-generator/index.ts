import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { inferIcuParamTypes, type IcuParamType } from './icu-type-inferrer.js';

/**
 * Options for type generation
 */
export interface TypeGeneratorOptions {
  /** Path to translations directory */
  translationsPath: string;
  /** Source locale file name (e.g., 'en') */
  sourceLocale: string;
  /** Output path for generated .d.ts file */
  outputPath: string;
  /** File pattern to find locale files (e.g., '{lang}.json') */
  filePattern: string;
  /** Whether translations are nested objects */
  nested: boolean;
}

/**
 * Represents a parsed translation entry with type information
 */
interface TranslationEntry {
  /** Dot-notation key (e.g., 'auth.login.title') */
  key: string;
  /** Original translation value */
  value: string;
  /** Inferred ICU parameter types */
  params: IcuParamType[];
}

/**
 * Namespace entries with their translation keys
 */
interface NamespaceEntries {
  /** Namespace name */
  namespace: string;
  /** Translation entries for this namespace */
  entries: TranslationEntry[];
}

/**
 * Result of type generation
 */
export interface TypeGeneratorResult {
  /** Number of root translation keys processed */
  keyCount: number;
  /** Number of keys with ICU parameters */
  keysWithParams: number;
  /** Number of namespaces found */
  namespaceCount: number;
  /** Output file path */
  outputPath: string;
}

/**
 * Generates TypeScript type definitions from translation files.
 *
 * Creates a .d.ts file that augments the @lingx/sdk-nextjs module
 * with type-safe translation keys and ICU parameter types.
 *
 * File structure:
 * - locales/{lang}.json → TranslationResources.keys (root keys)
 * - locales/{namespace}/{lang}.json → NamespaceKeys[namespace]
 */
export async function generateTypes(
  options: TypeGeneratorOptions
): Promise<TypeGeneratorResult> {
  const fileName = options.filePattern.replace('{lang}', options.sourceLocale);

  // Read root locale file for TranslationResources.keys
  const rootFilePath = join(options.translationsPath, fileName);

  if (!existsSync(rootFilePath)) {
    throw new Error(`Source locale file not found: ${rootFilePath}`);
  }

  const rootEntries = await readTranslationFile(rootFilePath, options.nested);

  // Scan for namespace subdirectories
  const namespaceEntries: NamespaceEntries[] = [];

  if (existsSync(options.translationsPath)) {
    const dirEntries = await readdir(options.translationsPath, { withFileTypes: true });

    for (const entry of dirEntries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const nsFilePath = join(options.translationsPath, entry.name, fileName);
        if (existsSync(nsFilePath)) {
          const entries = await readTranslationFile(nsFilePath, options.nested);
          if (entries.length > 0) {
            namespaceEntries.push({
              namespace: entry.name,
              entries,
            });
          }
        }
      }
    }
  }

  // Sort namespaces alphabetically
  namespaceEntries.sort((a, b) => a.namespace.localeCompare(b.namespace));

  // Generate TypeScript declaration content
  const declarationContent = generateDeclarationFile(rootEntries, namespaceEntries);

  // Ensure output directory exists
  const outputDir = dirname(options.outputPath);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // Write declaration file
  await writeFile(options.outputPath, declarationContent, 'utf-8');

  // Count total keys including namespaces
  const totalNsKeys = namespaceEntries.reduce((sum, ns) => sum + ns.entries.length, 0);
  const allEntries = [...rootEntries, ...namespaceEntries.flatMap(ns => ns.entries)];

  return {
    keyCount: rootEntries.length + totalNsKeys,
    keysWithParams: allEntries.filter((e) => e.params.length > 0).length,
    namespaceCount: namespaceEntries.length,
    outputPath: options.outputPath,
  };
}

/**
 * Reads and parses a translation file
 */
async function readTranslationFile(
  filePath: string,
  nested: boolean
): Promise<TranslationEntry[]> {
  const content = await readFile(filePath, 'utf-8');
  const rawTranslations = JSON.parse(content);

  // Flatten nested translations to dot-notation
  const flatTranslations = nested
    ? flattenObject(rawTranslations)
    : rawTranslations;

  // Process each translation to extract type information
  const entries: TranslationEntry[] = [];
  for (const [key, value] of Object.entries(flatTranslations)) {
    if (typeof value !== 'string') continue;

    const params = inferIcuParamTypes(value);
    entries.push({ key, value, params });
  }

  return entries;
}

/**
 * Flattens a nested object to dot-notation keys
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Escapes a string for use in JSDoc comments
 */
function escapeJsDoc(str: string): string {
  return str
    .replace(/\*/g, '\\*')
    .replace(/\//g, '\\/')
    .replace(/\n/g, ' ')
    .substring(0, 100) + (str.length > 100 ? '...' : '');
}

/**
 * Generates the TypeScript declaration file content
 */
function generateDeclarationFile(
  rootEntries: TranslationEntry[],
  namespaceEntries: NamespaceEntries[] = []
): string {
  // Sort root entries alphabetically
  const sortedRootEntries = [...rootEntries].sort((a, b) => a.key.localeCompare(b.key));

  // Generate TranslationKeys union type (root keys only)
  const keysUnion = sortedRootEntries.length > 0
    ? sortedRootEntries.map((e) => `      | '${e.key}'`).join('\n')
    : '      | never';

  // Collect all entries (root + namespaced) for params
  const allEntries = [
    ...sortedRootEntries,
    ...namespaceEntries.flatMap(ns => ns.entries),
  ];

  // Generate TranslationParams interface (for all keys with params)
  const paramsEntries = allEntries
    .filter((e) => e.params.length > 0)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((e) => {
      const paramType = e.params.map((p) => `${p.name}: ${p.type}`).join('; ');
      const jsdoc = `    /** ${escapeJsDoc(e.value)} */`;
      return `${jsdoc}\n    '${e.key}': { ${paramType} };`;
    })
    .join('\n');

  // Generate NamespaceKeys interface
  const namespaceKeysContent = namespaceEntries.length > 0
    ? namespaceEntries.map(ns => {
        const sortedNsEntries = [...ns.entries].sort((a, b) => a.key.localeCompare(b.key));
        const nsKeysUnion = sortedNsEntries.map((e) => `        | '${e.key}'`).join('\n');
        return `    /** Keys in the '${ns.namespace}' namespace */\n    '${ns.namespace}':\n${nsKeysUnion};`;
      }).join('\n')
    : '    // No namespaces defined';

  // Build the full declaration file
  // Note: We use interface merging to augment the SDK types
  // The SDK defines TranslationResources and NamespaceKeys as empty interfaces that we extend here
  return `// This file is auto-generated by Lingx CLI
// Do not edit manually. Run 'lingx types' to regenerate.

import '@lingx/sdk-nextjs';

declare module '@lingx/sdk-nextjs' {
  /**
   * Generated translation resources.
   * This interface is merged with the SDK's TranslationResources.
   */
  interface TranslationResources {
    /**
     * Root translation keys (no namespace).
     * Generated from source locale translations.
     */
    keys:
${keysUnion};
  }

  /**
   * Namespace-specific translation keys.
   * Each namespace maps to its available keys.
   *
   * Usage: tKey('key', 'namespace')
   */
  interface NamespaceKeys {
${namespaceKeysContent}
  }

  /**
   * ICU parameter types for translation keys that require parameters.
   * Keys not listed here don't require parameters.
   */
  interface TranslationParams {
${paramsEntries || '    // No keys with parameters'}
  }
}
`;
}

export { inferIcuParamTypes, type IcuParamType } from './icu-type-inferrer.js';
