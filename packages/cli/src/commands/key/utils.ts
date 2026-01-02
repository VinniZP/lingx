import { readFile, readdir, stat, rm } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { parseUserKey, combineKey, toUserKey } from '@lingx/shared';
import { type LingxConfig } from '../../lib/config.js';
import { createFormatter, type Formatter } from '../../lib/formatter/index.js';
import {
  writeTranslationFile,
  extractLanguageFromFilename,
} from '../../lib/translation-io.js';
import { type ApiClient } from '../../lib/api.js';

export interface ParsedKey {
  namespace: string | null;
  key: string;
  combinedKey: string; // Internal format with \u001F delimiter
  userKey: string; // User-facing format with : delimiter
}

/**
 * Parse a key argument that may contain namespace
 * Supports both "namespace:key" format and separate --namespace option
 */
export function parseKeyArgument(
  keyArg: string,
  namespaceOption?: string
): ParsedKey {
  // First check if namespace is in the key argument
  const { namespace: nsFromKey, key } = parseUserKey(keyArg);

  // --namespace option takes precedence only if key has no namespace
  const namespace = nsFromKey ?? namespaceOption ?? null;

  return {
    namespace,
    key,
    combinedKey: combineKey(namespace, key),
    userKey: toUserKey(namespace, key),
  };
}

/**
 * Get all language codes from translation directory
 */
export async function getProjectLanguages(
  translationsPath: string,
  format: 'json' | 'yaml',
  filePattern: string
): Promise<string[]> {
  if (!existsSync(translationsPath)) {
    return [];
  }

  const languages = new Set<string>();
  const ext = format === 'json' ? '.json' : '.yaml';

  // Check root directory
  const files = await readdir(translationsPath);
  for (const file of files) {
    const filePath = join(translationsPath, file);
    const fileStat = await stat(filePath);

    if (fileStat.isFile() && extname(file).toLowerCase() === ext) {
      const lang = extractLanguageFromFilename(file, filePattern);
      languages.add(lang);
    }

    // Check namespace subdirectories
    if (fileStat.isDirectory() && !file.startsWith('.')) {
      const nsFiles = await readdir(filePath);
      for (const nsFile of nsFiles) {
        if (extname(nsFile).toLowerCase() === ext) {
          const lang = extractLanguageFromFilename(nsFile, filePattern);
          languages.add(lang);
        }
      }
    }
  }

  return Array.from(languages).sort();
}

/**
 * Get file path for a key's translation file
 */
export function getTranslationFilePath(
  translationsPath: string,
  parsedKey: ParsedKey,
  lang: string,
  format: 'json' | 'yaml'
): string {
  const ext = format === 'json' ? '.json' : '.yaml';
  if (parsedKey.namespace) {
    return join(translationsPath, parsedKey.namespace, `${lang}${ext}`);
  }
  return join(translationsPath, `${lang}${ext}`);
}

/**
 * Read translations from a single file
 */
export async function readTranslationsFromFile(
  filePath: string,
  formatter: Formatter
): Promise<Record<string, string>> {
  if (!existsSync(filePath)) {
    return {};
  }
  const content = await readFile(filePath, 'utf-8');
  return formatter.parse(content);
}

/**
 * Read a single key's value across all languages
 */
export async function readKeyValues(
  translationsPath: string,
  parsedKey: ParsedKey,
  config: LingxConfig
): Promise<Record<string, string | undefined>> {
  const formatter = createFormatter(config.format.type, {
    nested: config.format.nested,
    indentation: config.format.indentation,
  });

  const languages = await getProjectLanguages(
    translationsPath,
    config.format.type,
    config.pull.filePattern
  );

  const result: Record<string, string | undefined> = {};

  for (const lang of languages) {
    const filePath = getTranslationFilePath(
      translationsPath,
      parsedKey,
      lang,
      config.format.type
    );
    const translations = await readTranslationsFromFile(filePath, formatter);
    result[lang] = translations[parsedKey.key];
  }

  return result;
}

/**
 * Write a key's value to a specific language file
 */
export async function writeKeyValue(
  translationsPath: string,
  parsedKey: ParsedKey,
  lang: string,
  value: string,
  config: LingxConfig
): Promise<void> {
  const formatter = createFormatter(config.format.type, {
    nested: config.format.nested,
    indentation: config.format.indentation,
  });

  const filePath = getTranslationFilePath(
    translationsPath,
    parsedKey,
    lang,
    config.format.type
  );

  // Read existing translations (or empty object)
  const translations = await readTranslationsFromFile(filePath, formatter);

  // Add/update the key
  translations[parsedKey.key] = value;

  // Write back
  await writeTranslationFile(filePath, translations, formatter);
}

/**
 * Remove a key from a specific language file
 * @returns true if key was found and removed
 */
export async function removeKeyFromFile(
  translationsPath: string,
  parsedKey: ParsedKey,
  lang: string,
  config: LingxConfig
): Promise<boolean> {
  const formatter = createFormatter(config.format.type, {
    nested: config.format.nested,
    indentation: config.format.indentation,
  });

  const filePath = getTranslationFilePath(
    translationsPath,
    parsedKey,
    lang,
    config.format.type
  );

  if (!existsSync(filePath)) {
    return false;
  }

  const translations = await readTranslationsFromFile(filePath, formatter);

  if (!(parsedKey.key in translations)) {
    return false;
  }

  delete translations[parsedKey.key];

  // Write back
  await writeTranslationFile(filePath, translations, formatter);
  return true;
}

/**
 * Check if a key exists in any language file
 */
export async function keyExists(
  translationsPath: string,
  parsedKey: ParsedKey,
  config: LingxConfig
): Promise<boolean> {
  const values = await readKeyValues(translationsPath, parsedKey, config);
  return Object.values(values).some((v) => v !== undefined);
}

/**
 * Extract dynamic language options from raw arguments
 * Returns map of language code to value
 *
 * Parses args like: --en "Hello" --de "Hallo" --fr "Bonjour"
 */
export function extractLanguageValues(
  rawArgs: string[]
): Record<string, string> {
  const result: Record<string, string> = {};

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    // Match --xx or --xxx (2-3 letter language codes)
    if (arg.startsWith('--') && /^--[a-z]{2,3}$/i.test(arg)) {
      const lang = arg.slice(2).toLowerCase();
      const value = rawArgs[i + 1];
      // Make sure next arg exists and isn't another flag
      if (value && !value.startsWith('-')) {
        result[lang] = value;
        i++; // Skip the value in next iteration
      }
    }
  }

  return result;
}

/**
 * Clean up empty namespace directories
 */
export async function cleanupEmptyNamespaceDir(
  translationsPath: string,
  namespace: string
): Promise<void> {
  const nsDir = join(translationsPath, namespace);
  if (!existsSync(nsDir)) {
    return;
  }

  const files = await readdir(nsDir);
  if (files.length === 0) {
    await rm(nsDir, { recursive: true });
  }
}

// ============================================================================
// API Helper Functions
// ============================================================================

export interface BranchInfo {
  branchId: string;
  projectId: string;
}

/**
 * Resolve branch ID from project/space/branch names
 */
export async function resolveBranchId(
  client: ApiClient,
  project: string,
  space: string,
  branch: string
): Promise<BranchInfo> {
  // Get spaces for project
  const spacesRes = await client.get<{
    spaces: { id: string; slug: string }[];
  }>(`/api/projects/${project}/spaces`);

  const targetSpace = spacesRes.spaces.find((s) => s.slug === space);
  if (!targetSpace) {
    throw new Error(`Space "${space}" not found in project "${project}"`);
  }

  // Get branches for space
  const spaceDetails = await client.get<{
    id: string;
    branches: { id: string; name: string }[];
  }>(`/api/spaces/${targetSpace.id}`);

  const targetBranch = spaceDetails.branches.find((b) => b.name === branch);
  if (!targetBranch) {
    throw new Error(`Branch "${branch}" not found in space "${space}"`);
  }

  return {
    branchId: targetBranch.id,
    projectId: project,
  };
}

/**
 * Find key ID by name and namespace
 */
export async function findKeyId(
  client: ApiClient,
  branchId: string,
  name: string,
  namespace: string | null
): Promise<string | null> {
  // Use search to find the key
  const nsParam = namespace === null ? '__root__' : namespace;
  const res = await client.get<{
    keys: { id: string; name: string; namespace: string | null }[];
  }>(
    `/api/branches/${branchId}/keys?namespace=${encodeURIComponent(nsParam)}&search=${encodeURIComponent(name)}&limit=100`
  );

  const key = res.keys.find(
    (k) => k.name === name && k.namespace === namespace
  );
  return key?.id ?? null;
}

/**
 * Create key via API
 */
export async function createKeyRemote(
  client: ApiClient,
  branchId: string,
  name: string,
  namespace: string | null,
  translations?: Record<string, string>
): Promise<string> {
  const res = await client.post<{ id: string }>(
    `/api/branches/${branchId}/keys`,
    {
      name,
      namespace,
    }
  );

  // If translations provided, set them
  if (translations && Object.keys(translations).length > 0) {
    await client.put(`/api/keys/${res.id}/translations`, { translations });
  }

  return res.id;
}

/**
 * Delete key via API
 */
export async function deleteKeyRemote(
  client: ApiClient,
  keyId: string
): Promise<void> {
  await client.delete(`/api/keys/${keyId}`);
}

/**
 * Update key (rename/move namespace) via API
 */
export async function updateKeyRemote(
  client: ApiClient,
  keyId: string,
  updates: { name?: string; namespace?: string | null }
): Promise<void> {
  await client.put(`/api/keys/${keyId}`, updates);
}

/**
 * Update translations for a key via API
 */
export async function updateKeyTranslationsRemote(
  client: ApiClient,
  keyId: string,
  translations: Record<string, string>
): Promise<void> {
  await client.put(`/api/keys/${keyId}/translations`, { translations });
}
