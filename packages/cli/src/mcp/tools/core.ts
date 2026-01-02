import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { join, dirname } from 'path';
import { mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { glob } from 'glob';
import { parseNamespacedKey, type CliTranslationsResponse } from '@lingx/shared';
import { loadConfig, getConfigPath } from '../../lib/config.js';
import { createApiClientFromConfig, ApiError } from '../../lib/api.js';
import { credentialStore } from '../../lib/auth.js';
import { createFormatter } from '../../lib/formatter/index.js';
import { writeTranslationFile } from '../../lib/translation-io.js';
import { createExtractor } from '../../lib/extractor/index.js';
import { validateIcuMessage } from '../../lib/validator/icu-validator.js';
import { generateTypes } from '../../lib/type-generator/index.js';
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
 * Register core CLI tools: status, pull, push, sync, extract, check, types.
 */
export function registerCoreTools(server: McpServer): void {
  // lingx_status - Get current project status
  server.tool(
    'lingx_status',
    'Get current Lingx configuration and connection status. Use this first to understand the project setup.',
    {
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const configPath = getConfigPath(cwd);
        const credentials = credentialStore.getCredentials();

        const status = {
          authenticated: !!credentials,
          configFile: configPath,
          project: config.project ?? null,
          space: config.defaultSpace ?? null,
          branch: config.defaultBranch,
          sourceLocale: config.types?.sourceLocale ?? 'en',
          translationsPath: config.paths.translations,
          sourcePath: config.paths.source,
          format: config.format.type,
          framework: config.extract.framework,
          apiUrl: credentials?.apiUrl ?? config.api.url,
        };

        return jsonResult(status);
      } catch (error) {
        return textResult(`Error getting status: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_get_config - Get full configuration
  server.tool(
    'lingx_get_config',
    'Get the current Lingx configuration from lingx.config.ts or .lingx.yml.',
    {
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const configPath = getConfigPath(cwd);

        return jsonResult({
          config,
          configPath,
        });
      } catch (error) {
        return textResult(`Error loading config: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_pull - Download translations from platform
  server.tool(
    'lingx_pull',
    'Download translations from Lingx platform to local files. Use when you need to get the latest translations from the server.',
    {
      project: z.string().optional().describe('Project slug (uses config default if omitted)'),
      space: z.string().optional().describe('Space slug (uses config default if omitted)'),
      branch: z.string().optional().describe('Branch name (default: main)'),
      language: z.string().optional().describe('Specific language code to pull (default: all)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const project = args.project ?? config.project;
        const space = args.space ?? config.defaultSpace;
        const branch = args.branch ?? config.defaultBranch;

        if (!project) {
          return textResult('Error: Project is required. Use --project or set in config file.');
        }
        if (!space) {
          return textResult('Error: Space is required. Use --space or set defaultSpace in config file.');
        }

        const client = await createApiClientFromConfig(cwd);

        // Get space and branch IDs
        const spaces = await client.get<{ spaces: { id: string; slug: string }[] }>(
          `/api/projects/${project}/spaces`
        );
        const targetSpace = spaces.spaces.find(s => s.slug === space);
        if (!targetSpace) {
          return textResult(`Error: Space "${space}" not found in project "${project}"`);
        }

        const spaceDetails = await client.get<{ branches: { id: string; name: string }[] }>(
          `/api/spaces/${targetSpace.id}`
        );
        const targetBranch = spaceDetails.branches.find(b => b.name === branch);
        if (!targetBranch) {
          return textResult(`Error: Branch "${branch}" not found in space "${space}"`);
        }

        // Fetch translations
        const response = await client.get<CliTranslationsResponse>(
          `/api/branches/${targetBranch.id}/translations`
        );

        // Create formatter and write files
        const formatter = createFormatter(config.format.type, {
          nested: config.format.nested,
          indentation: config.format.indentation,
        });

        const absOutputDir = join(cwd, config.paths.translations);
        const languages = args.language
          ? [args.language]
          : (config.pull.languages.length > 0 ? config.pull.languages : response.languages);

        let filesWritten = 0;
        const keysByLang: Record<string, number> = {};

        for (const lang of languages) {
          const allTranslations = response.translations[lang] ?? {};
          if (Object.keys(allTranslations).length === 0) continue;

          // Group by namespace
          const byNamespace = new Map<string | null, Record<string, string>>();
          for (const [combinedKey, value] of Object.entries(allTranslations)) {
            const { namespace, key } = parseNamespacedKey(combinedKey);
            if (!byNamespace.has(namespace)) {
              byNamespace.set(namespace, {});
            }
            byNamespace.get(namespace)![key] = value;
          }

          // Write files
          for (const [namespace, translations] of byNamespace) {
            if (Object.keys(translations).length === 0) continue;

            const fileName = config.pull.filePattern.replace('{lang}', lang) || `${lang}${formatter.extension}`;
            const filePath = namespace
              ? join(absOutputDir, namespace, fileName)
              : join(absOutputDir, fileName);

            const dir = dirname(filePath);
            if (!existsSync(dir)) {
              await mkdir(dir, { recursive: true });
            }

            await writeTranslationFile(filePath, translations, formatter);
            filesWritten++;
            keysByLang[lang] = (keysByLang[lang] ?? 0) + Object.keys(translations).length;
          }
        }

        return jsonResult({
          success: true,
          filesWritten,
          languages: Object.keys(keysByLang),
          keysByLanguage: keysByLang,
          totalKeys: Object.values(keysByLang).reduce((a, b) => a + b, 0),
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return textResult(`API Error (${error.code}): ${error.message}`);
        }
        return textResult(`Error pulling translations: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_push - Upload translations to platform
  server.tool(
    'lingx_push',
    'Upload local translation files to Lingx platform. Detects conflicts and can resolve them.',
    {
      project: z.string().optional().describe('Project slug'),
      space: z.string().optional().describe('Space slug'),
      branch: z.string().optional().describe('Branch name'),
      languages: z.array(z.string()).optional().describe('Languages to push (default: all)'),
      force: z.boolean().optional().describe('Force push, overwrite conflicts'),
      delete: z.boolean().optional().describe('Delete remote keys not present locally'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const project = args.project ?? config.project;
        const space = args.space ?? config.defaultSpace;
        const branch = args.branch ?? config.defaultBranch;

        if (!project) {
          return textResult('Error: Project is required.');
        }
        if (!space) {
          return textResult('Error: Space is required.');
        }

        const client = await createApiClientFromConfig(cwd);

        // Get space and branch IDs
        const spaces = await client.get<{ spaces: { id: string; slug: string }[] }>(
          `/api/projects/${project}/spaces`
        );
        const targetSpace = spaces.spaces.find(s => s.slug === space);
        if (!targetSpace) {
          return textResult(`Error: Space "${space}" not found`);
        }

        const spaceDetails = await client.get<{ branches: { id: string; name: string }[] }>(
          `/api/spaces/${targetSpace.id}`
        );
        const targetBranch = spaceDetails.branches.find(b => b.name === branch);
        if (!targetBranch) {
          return textResult(`Error: Branch "${branch}" not found`);
        }

        // Read local translations
        const localTranslations = await readAllTranslations(cwd);

        // Fetch remote translations for conflict detection
        const remoteResponse = await client.get<CliTranslationsResponse>(
          `/api/branches/${targetBranch.id}/translations`
        );

        // Detect conflicts (if not force push)
        const conflicts: Array<{ key: string; lang: string; localValue: string; remoteValue: string }> = [];

        if (!args.force) {
          for (const [lang, keys] of Object.entries(localTranslations)) {
            const remoteKeys = remoteResponse.translations[lang] ?? {};
            for (const [key, localValue] of Object.entries(keys)) {
              const remoteValue = remoteKeys[key];
              if (remoteValue && remoteValue !== localValue) {
                conflicts.push({ key, lang, localValue, remoteValue });
              }
            }
          }

          if (conflicts.length > 0) {
            return jsonResult({
              success: false,
              message: 'Conflicts detected. Use force=true to overwrite or resolve conflicts manually.',
              conflicts,
            });
          }
        }

        // Push translations
        const result = await client.post<{ keysUpdated: number; keysCreated: number; keysDeleted: number }>(
          `/api/branches/${targetBranch.id}/translations`,
          {
            translations: localTranslations,
            deleteUnused: args.delete ?? false,
          }
        );

        return jsonResult({
          success: true,
          keysUpdated: result.keysUpdated,
          keysCreated: result.keysCreated,
          keysDeleted: result.keysDeleted ?? 0,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return textResult(`API Error (${error.code}): ${error.message}`);
        }
        return textResult(`Error pushing translations: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_sync - Bidirectional sync
  server.tool(
    'lingx_sync',
    'Bidirectional sync between local files and Lingx platform. Merges changes from both sides.',
    {
      project: z.string().optional().describe('Project slug'),
      space: z.string().optional().describe('Space slug'),
      branch: z.string().optional().describe('Branch name'),
      forceLocal: z.boolean().optional().describe('Resolve conflicts using local values'),
      forceRemote: z.boolean().optional().describe('Resolve conflicts using remote values'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const project = args.project ?? config.project;
        const space = args.space ?? config.defaultSpace;
        const branch = args.branch ?? config.defaultBranch;

        if (!project || !space) {
          return textResult('Error: Project and space are required.');
        }

        const client = await createApiClientFromConfig(cwd);

        // Get branch ID
        const spaces = await client.get<{ spaces: { id: string; slug: string }[] }>(
          `/api/projects/${project}/spaces`
        );
        const targetSpace = spaces.spaces.find(s => s.slug === space);
        if (!targetSpace) {
          return textResult(`Error: Space "${space}" not found`);
        }

        const spaceDetails = await client.get<{ branches: { id: string; name: string }[] }>(
          `/api/spaces/${targetSpace.id}`
        );
        const targetBranch = spaceDetails.branches.find(b => b.name === branch);
        if (!targetBranch) {
          return textResult(`Error: Branch "${branch}" not found`);
        }

        // Read local and remote
        const localTranslations = await readAllTranslations(cwd);
        const remoteResponse = await client.get<CliTranslationsResponse>(
          `/api/branches/${targetBranch.id}/translations`
        );

        // Find differences and conflicts
        const toUpload: Record<string, Record<string, string>> = {};
        const toDownload: Record<string, Record<string, string>> = {};
        const conflicts: Array<{ key: string; lang: string; localValue: string; remoteValue: string }> = [];

        const allLangs = new Set([...Object.keys(localTranslations), ...Object.keys(remoteResponse.translations)]);

        for (const lang of allLangs) {
          const local = localTranslations[lang] ?? {};
          const remote = remoteResponse.translations[lang] ?? {};
          const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

          for (const key of allKeys) {
            const localValue = local[key];
            const remoteValue = remote[key];

            if (localValue && !remoteValue) {
              // Only in local - upload
              if (!toUpload[lang]) toUpload[lang] = {};
              toUpload[lang][key] = localValue;
            } else if (!localValue && remoteValue) {
              // Only in remote - download
              if (!toDownload[lang]) toDownload[lang] = {};
              toDownload[lang][key] = remoteValue;
            } else if (localValue && remoteValue && localValue !== remoteValue) {
              // Conflict
              if (args.forceLocal) {
                if (!toUpload[lang]) toUpload[lang] = {};
                toUpload[lang][key] = localValue;
              } else if (args.forceRemote) {
                if (!toDownload[lang]) toDownload[lang] = {};
                toDownload[lang][key] = remoteValue;
              } else {
                conflicts.push({ key, lang, localValue, remoteValue });
              }
            }
          }
        }

        if (conflicts.length > 0 && !args.forceLocal && !args.forceRemote) {
          return jsonResult({
            success: false,
            message: 'Conflicts detected. Use forceLocal=true or forceRemote=true to resolve.',
            conflicts,
            pendingUpload: Object.values(toUpload).reduce((acc, keys) => acc + Object.keys(keys).length, 0),
            pendingDownload: Object.values(toDownload).reduce((acc, keys) => acc + Object.keys(keys).length, 0),
          });
        }

        // Upload new local keys
        let uploaded = 0;
        if (Object.keys(toUpload).length > 0) {
          await client.post(`/api/branches/${targetBranch.id}/translations`, {
            translations: toUpload,
            deleteUnused: false,
          });
          uploaded = Object.values(toUpload).reduce((acc, keys) => acc + Object.keys(keys).length, 0);
        }

        // Download and write new remote keys
        let downloaded = 0;
        if (Object.keys(toDownload).length > 0) {
          const formatter = createFormatter(config.format.type, {
            nested: config.format.nested,
            indentation: config.format.indentation,
          });
          const absOutputDir = join(cwd, config.paths.translations);

          for (const [lang, translations] of Object.entries(toDownload)) {
            // Merge with existing local translations
            const existingLocal = localTranslations[lang] ?? {};
            const merged = { ...existingLocal, ...translations };

            const fileName = config.pull.filePattern.replace('{lang}', lang) || `${lang}${formatter.extension}`;
            const filePath = join(absOutputDir, fileName);

            const dir = dirname(filePath);
            if (!existsSync(dir)) {
              await mkdir(dir, { recursive: true });
            }

            await writeTranslationFile(filePath, merged, formatter);
            downloaded += Object.keys(translations).length;
          }
        }

        return jsonResult({
          success: true,
          uploaded,
          downloaded,
          conflictsResolved: args.forceLocal || args.forceRemote ? conflicts.length : 0,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return textResult(`API Error (${error.code}): ${error.message}`);
        }
        return textResult(`Error syncing: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_extract - Extract translation keys from source code
  server.tool(
    'lingx_extract',
    'Extract translation keys from source code. Identifies t(), useTranslation(), and tKey() calls.',
    {
      source: z.string().optional().describe('Source directory to scan'),
      detectIcu: z.boolean().optional().describe('Detect ICU MessageFormat variables'),
      sync: z.boolean().optional().describe('Sync extracted keys to locale files'),
      clean: z.boolean().optional().describe('Remove unused keys from locale files'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const sourceDir = args.source ?? config.paths.source;
        const absSourceDir = join(cwd, sourceDir);

        const extractor = createExtractor(config.extract.framework, {
          functions: config.extract.functions,
          markerFunctions: config.extract.markerFunctions ?? ['tKey'],
        });

        // Find all source files
        const files = await glob(config.extract.patterns, {
          cwd: absSourceDir,
          ignore: config.extract.exclude,
          absolute: true,
        });

        // Extract keys from all files
        const allKeys: Array<{ key: string; namespace?: string; file: string }> = [];

        for (const file of files) {
          const code = await readFile(file, 'utf-8');
          const result = extractor.extract(code, file);

          for (const extractedKey of result.keys) {
            allKeys.push({
              key: extractedKey.key,
              namespace: extractedKey.namespace,
              file: file.replace(cwd + '/', ''),
            });
          }
        }

        // Group by namespace
        const byNamespace: Record<string, string[]> = {};
        for (const keyInfo of allKeys) {
          const ns = keyInfo.namespace ?? '(root)';
          if (!byNamespace[ns]) byNamespace[ns] = [];
          byNamespace[ns].push(keyInfo.key);
        }

        // If sync is enabled, compare with existing locale files
        let newKeys: string[] = [];
        let unusedKeys: string[] = [];

        if (args.sync || args.clean) {
          const existingTranslations = await readAllTranslations(cwd);
          const sourceLocale = config.types?.sourceLocale ?? 'en';
          const existingKeySet = new Set(Object.keys(existingTranslations[sourceLocale] ?? {}));
          const extractedKeySet = new Set(allKeys.map(k => k.namespace ? `${k.namespace}:${k.key}` : k.key));

          newKeys = [...extractedKeySet].filter(k => !existingKeySet.has(k));
          unusedKeys = [...existingKeySet].filter(k => !extractedKeySet.has(k));
        }

        return jsonResult({
          totalKeys: allKeys.length,
          byNamespace,
          newKeys: newKeys.length > 0 ? newKeys : undefined,
          unusedKeys: unusedKeys.length > 0 ? unusedKeys : undefined,
          files: [...new Set(allKeys.map(k => k.file))].length,
        });
      } catch (error) {
        return textResult(`Error extracting keys: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_check - Validate translation coverage and quality
  server.tool(
    'lingx_check',
    'Check translation coverage, validate ICU syntax, and run quality checks. Essential for CI/CD pipelines.',
    {
      missing: z.boolean().optional().describe('Check for keys in code but not in platform'),
      unused: z.boolean().optional().describe('Check for keys in platform but not in code'),
      validateIcu: z.boolean().optional().describe('Validate ICU MessageFormat syntax'),
      quality: z.boolean().optional().describe('Run quality checks (placeholders, whitespace)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const absSourceDir = join(cwd, config.paths.source);

        // Extract keys from source
        const extractor = createExtractor(config.extract.framework, {
          functions: config.extract.functions,
          markerFunctions: config.extract.markerFunctions ?? ['tKey'],
        });

        const files = await glob(config.extract.patterns, {
          cwd: absSourceDir,
          ignore: config.extract.exclude,
          absolute: true,
        });

        const codeKeysList: string[] = [];
        for (const file of files) {
          const code = await readFile(file, 'utf-8');
          const result = extractor.extract(code, file);
          for (const extractedKey of result.keys) {
            const fullKey = extractedKey.namespace ? `${extractedKey.namespace}:${extractedKey.key}` : extractedKey.key;
            codeKeysList.push(fullKey);
          }
        }
        const codeKeys = new Set(codeKeysList);

        // Read local translations
        const translations = await readAllTranslations(cwd);
        const sourceLocale = config.types?.sourceLocale ?? 'en';
        const platformKeys = new Set(Object.keys(translations[sourceLocale] ?? {}));

        // Check missing and unused
        const missingKeys = args.missing !== false
          ? [...codeKeys].filter(k => !platformKeys.has(k))
          : [];
        const unusedTranslations = args.unused !== false
          ? [...platformKeys].filter(k => !codeKeys.has(k))
          : [];

        // Validate ICU
        const icuErrors: Array<{ key: string; lang: string; error: string }> = [];
        if (args.validateIcu !== false) {
          for (const [lang, keys] of Object.entries(translations)) {
            for (const [key, value] of Object.entries(keys)) {
              const validation = validateIcuMessage(value);
              if (!validation.isValid) {
                for (const error of validation.errors) {
                  icuErrors.push({ key, lang, error: error.message });
                }
              }
            }
          }
        }

        // Quality checks
        const qualityIssues: Array<{ key: string; lang: string; issue: string; severity: string }> = [];
        if (args.quality !== false) {
          const sourceTranslations = translations[sourceLocale] ?? {};

          // Extract ICU variable names (not the full placeholder content)
          // Handles: {name}, {count, plural, ...}, {date, date, short}
          const extractIcuVariables = (text: string): string[] => {
            const variables: string[] = [];
            let depth = 0;
            let varStart = -1;

            for (let i = 0; i < text.length; i++) {
              const char = text[i];
              if (char === '{') {
                if (depth === 0) {
                  varStart = i + 1;
                }
                depth++;
              } else if (char === '}') {
                // Extract variable before closing if at top level
                if (depth === 1 && varStart !== -1) {
                  const varName = text.slice(varStart, i).trim();
                  if (varName && varName !== '#') {
                    variables.push(varName);
                  }
                  varStart = -1;
                }
                depth--;
              } else if (depth === 1 && varStart !== -1 && (char === ',' || char === ' ')) {
                // At top level, extract variable name (up to comma or space)
                const varName = text.slice(varStart, i).trim();
                if (varName && varName !== '#') {
                  variables.push(varName);
                }
                varStart = -1;
              }
            }
            return [...new Set(variables)].sort();
          };

          for (const [lang, keys] of Object.entries(translations)) {
            if (lang === sourceLocale) continue;
            for (const [key, value] of Object.entries(keys)) {
              const sourceValue = sourceTranslations[key];
              if (!sourceValue) continue;

              // Check for ICU variable mismatches
              const sourceVars = extractIcuVariables(sourceValue);
              const targetVars = extractIcuVariables(value);

              if (JSON.stringify(sourceVars) !== JSON.stringify(targetVars)) {
                const missing = sourceVars.filter(v => !targetVars.includes(v));
                const extra = targetVars.filter(v => !sourceVars.includes(v));
                const parts: string[] = [];
                if (missing.length > 0) parts.push(`missing: {${missing.join('}, {')}}`);
                if (extra.length > 0) parts.push(`extra: {${extra.join('}, {')}}`);

                qualityIssues.push({
                  key,
                  lang,
                  issue: `Variable mismatch: ${parts.join(', ')}`,
                  severity: 'error',
                });
              }

              // Check for leading/trailing whitespace differences
              if (sourceValue.trim() === sourceValue && value !== value.trim()) {
                qualityIssues.push({
                  key,
                  lang,
                  issue: 'Translation has leading/trailing whitespace that source does not have',
                  severity: 'warning',
                });
              }
            }
          }
        }

        const passed = missingKeys.length === 0 &&
          icuErrors.length === 0 &&
          qualityIssues.filter(i => i.severity === 'error').length === 0;

        return jsonResult({
          passed,
          codeKeys: codeKeys.size,
          platformKeys: platformKeys.size,
          missingKeys: missingKeys.length > 0 ? missingKeys : undefined,
          unusedKeys: unusedTranslations.length > 0 ? unusedTranslations : undefined,
          icuErrors: icuErrors.length > 0 ? icuErrors : undefined,
          qualityIssues: qualityIssues.length > 0 ? qualityIssues : undefined,
        });
      } catch (error) {
        return textResult(`Error checking translations: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_types - Generate TypeScript types
  server.tool(
    'lingx_types',
    'Generate TypeScript types from translation files for type-safe translations.',
    {
      output: z.string().optional().describe('Output file path'),
      locale: z.string().optional().describe('Source locale to use (default: en)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const outputPath = args.output ?? config.types?.output ?? './src/lingx.d.ts';
        const sourceLocale = args.locale ?? config.types?.sourceLocale ?? 'en';

        // Generate types
        const result = await generateTypes({
          translationsPath: join(cwd, config.paths.translations),
          sourceLocale,
          outputPath: join(cwd, outputPath),
          filePattern: config.pull.filePattern,
          nested: config.format.nested,
        });

        return jsonResult({
          success: true,
          outputPath,
          keyCount: result.keyCount,
          keysWithParams: result.keysWithParams,
          namespaceCount: result.namespaceCount,
        });
      } catch (error) {
        return textResult(`Error generating types: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
