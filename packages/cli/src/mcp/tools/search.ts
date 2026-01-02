import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../../lib/config.js';
import { parseNamespacedKey } from '@lingx/shared';
import { readAllTranslations } from '../utils.js';

/**
 * Helper to create a text result for MCP tools.
 */
function textResult(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  };
}

/**
 * Helper to create a JSON result for MCP tools.
 */
function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0 to 1).
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Convert glob pattern to regex.
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Register search tools: search keys, search translations, find similar.
 */
export function registerSearchTools(server: McpServer): void {
  // lingx_search_keys - Search keys by name pattern
  server.tool(
    'lingx_search_keys',
    'Search translation keys by name pattern. Supports glob patterns like "button.*" or "*error*".',
    {
      pattern: z.string().describe('Search pattern (e.g., "button.*", "*error*")'),
      namespace: z.string().optional().describe('Filter by namespace'),
      includeValues: z.boolean().optional().describe('Include translation values in results'),
      limit: z.number().optional().describe('Maximum results to return (default: 50)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const limit = args.limit ?? 50;

        // Read all translations
        const translations = await readAllTranslations(cwd);

        const sourceLocale = config.types?.sourceLocale ?? 'en';
        const sourceTranslations = translations[sourceLocale] ?? {};

        // Build regex from pattern
        const regex = globToRegex(args.pattern);

        // Search keys
        const results: Array<{
          key: string;
          namespace: string | null;
          translations?: Record<string, string>;
        }> = [];

        for (const combinedKey of Object.keys(sourceTranslations)) {
          const { namespace, key } = parseNamespacedKey(combinedKey);

          // Filter by namespace if specified
          if (args.namespace !== undefined && namespace !== args.namespace) {
            continue;
          }

          // Check if key matches pattern
          const searchKey = namespace ? `${namespace}:${key}` : key;
          if (regex.test(key) || regex.test(searchKey)) {
            const result: {
              key: string;
              namespace: string | null;
              translations?: Record<string, string>;
            } = {
              key,
              namespace,
            };

            if (args.includeValues) {
              result.translations = {};
              for (const [lang, langTranslations] of Object.entries(translations)) {
                const val = langTranslations[combinedKey];
                if (val !== undefined) {
                  result.translations[lang] = val;
                }
              }
            }

            results.push(result);

            if (results.length >= limit) break;
          }
        }

        return jsonResult({
          pattern: args.pattern,
          keys: results,
          total: results.length,
          limited: results.length >= limit,
        });
      } catch (error) {
        return textResult(`Error searching keys: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_search_translations - Search by translation value
  server.tool(
    'lingx_search_translations',
    'Search keys by their translation values. Useful for finding existing translations or duplicates.',
    {
      query: z.string().describe('Text to search for in translation values'),
      language: z.string().optional().describe('Language to search in (default: source locale)'),
      exactMatch: z.boolean().optional().describe('Require exact match vs substring'),
      limit: z.number().optional().describe('Maximum results to return (default: 50)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const limit = args.limit ?? 50;

        // Read all translations
        const translations = await readAllTranslations(cwd);

        const searchLanguage = args.language ?? config.types?.sourceLocale ?? 'en';
        const searchTranslations = translations[searchLanguage] ?? {};

        const results: Array<{
          key: string;
          namespace: string | null;
          matchedLanguage: string;
          matchedValue: string;
          allTranslations: Record<string, string>;
        }> = [];

        const queryLower = args.query.toLowerCase();

        for (const [combinedKey, value] of Object.entries(searchTranslations)) {
          const valueLower = value.toLowerCase();
          const matches = args.exactMatch
            ? valueLower === queryLower
            : valueLower.includes(queryLower);

          if (matches) {
            const { namespace, key } = parseNamespacedKey(combinedKey);

            const allTranslations: Record<string, string> = {};
            for (const [lang, langTranslations] of Object.entries(translations)) {
              const val = langTranslations[combinedKey];
              if (val !== undefined) {
                allTranslations[lang] = val;
              }
            }

            results.push({
              key,
              namespace,
              matchedLanguage: searchLanguage,
              matchedValue: value,
              allTranslations,
            });

            if (results.length >= limit) break;
          }
        }

        return jsonResult({
          query: args.query,
          language: searchLanguage,
          results,
          total: results.length,
          limited: results.length >= limit,
        });
      } catch (error) {
        return textResult(`Error searching translations: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_find_similar_keys - Find similar or potentially duplicate keys
  server.tool(
    'lingx_find_similar_keys',
    'Find keys with similar names or similar translation values. Helps identify duplicates.',
    {
      key: z.string().optional().describe('Find keys similar to this key'),
      threshold: z.number().optional().describe('Similarity threshold 0-1 (default: 0.7)'),
      checkValues: z.boolean().optional().describe('Also check translation value similarity'),
      limit: z.number().optional().describe('Maximum results to return (default: 20)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const threshold = args.threshold ?? 0.7;
        const limit = args.limit ?? 20;

        // Read all translations
        const translations = await readAllTranslations(cwd);

        const sourceLocale = config.types?.sourceLocale ?? 'en';
        const sourceTranslations = translations[sourceLocale] ?? {};
        const allKeys = Object.keys(sourceTranslations);

        const similar: Array<{
          key1: string;
          key2: string;
          nameSimilarity: number;
          valueSimilarity?: number;
          suggestion: string;
        }> = [];

        if (args.key) {
          // Find keys similar to the specified key
          const { namespace, key } = parseNamespacedKey(args.key);
          const targetKey = namespace ? `${namespace}:${key}` : key;
          const targetValue = sourceTranslations[args.key] ?? '';

          for (const combinedKey of allKeys) {
            if (combinedKey === args.key) continue;

            const { namespace: ns2, key: key2 } = parseNamespacedKey(combinedKey);
            const otherKey = ns2 ? `${ns2}:${key2}` : key2;

            const nameSim = similarity(targetKey, otherKey);

            if (nameSim >= threshold) {
              const result: {
                key1: string;
                key2: string;
                nameSimilarity: number;
                valueSimilarity?: number;
                suggestion: string;
              } = {
                key1: targetKey,
                key2: otherKey,
                nameSimilarity: Math.round(nameSim * 100) / 100,
                suggestion: 'Consider consolidating these keys',
              };

              if (args.checkValues) {
                const otherValue = sourceTranslations[combinedKey] ?? '';
                result.valueSimilarity = Math.round(similarity(targetValue, otherValue) * 100) / 100;
              }

              similar.push(result);

              if (similar.length >= limit) break;
            }
          }
        } else {
          // Find all potentially duplicate keys (pairs)
          const checked = new Set<string>();

          for (let i = 0; i < allKeys.length && similar.length < limit; i++) {
            const key1 = allKeys[i];
            const { namespace: ns1, key: k1 } = parseNamespacedKey(key1);
            const displayKey1 = ns1 ? `${ns1}:${k1}` : k1;

            for (let j = i + 1; j < allKeys.length && similar.length < limit; j++) {
              const key2 = allKeys[j];
              const pairKey = `${key1}:${key2}`;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);

              const { namespace: ns2, key: k2 } = parseNamespacedKey(key2);
              const displayKey2 = ns2 ? `${ns2}:${k2}` : k2;

              const nameSim = similarity(displayKey1, displayKey2);

              if (nameSim >= threshold) {
                const result: {
                  key1: string;
                  key2: string;
                  nameSimilarity: number;
                  valueSimilarity?: number;
                  suggestion: string;
                } = {
                  key1: displayKey1,
                  key2: displayKey2,
                  nameSimilarity: Math.round(nameSim * 100) / 100,
                  suggestion: 'Potential duplicate - consider consolidating',
                };

                if (args.checkValues) {
                  const val1 = sourceTranslations[key1] ?? '';
                  const val2 = sourceTranslations[key2] ?? '';
                  result.valueSimilarity = Math.round(similarity(val1, val2) * 100) / 100;
                }

                similar.push(result);
              }
            }
          }
        }

        // Sort by similarity (highest first)
        similar.sort((a, b) => b.nameSimilarity - a.nameSimilarity);

        return jsonResult({
          threshold,
          similar: similar.slice(0, limit),
          total: similar.length,
        });
      } catch (error) {
        return textResult(`Error finding similar keys: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
