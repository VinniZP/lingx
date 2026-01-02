import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { join } from 'path';
import { loadConfig } from '../../lib/config.js';
import { createApiClientFromConfig } from '../../lib/api.js';
import {
  parseKeyArgument,
  getProjectLanguages,
  keyExists,
  writeKeyValue,
  removeKeyFromFile,
  readKeyValues,
  cleanupEmptyNamespaceDir,
  resolveBranchId,
  findKeyId,
  createKeyRemote,
  deleteKeyRemote,
  updateKeyRemote,
  updateKeyTranslationsRemote,
} from '../../commands/key/utils.js';
import { generateTypes } from '../../lib/type-generator/index.js';

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
 * Register key management tools: add, remove, move.
 */
export function registerKeyTools(server: McpServer): void {
  // lingx_key_add - Add or update a translation key
  server.tool(
    'lingx_key_add',
    'Add a new translation key to local files. Optionally push to remote.',
    {
      key: z.string().describe('Key name (supports namespace:key format)'),
      namespace: z.string().optional().describe('Namespace for the key'),
      value: z.string().optional().describe('Default value for all languages'),
      values: z.record(z.string(), z.string()).optional().describe('Language-specific values { en: "Hello", de: "Hallo" }'),
      overwrite: z.boolean().optional().describe('Update existing key instead of failing'),
      push: z.boolean().optional().describe('Push to remote API'),
      project: z.string().optional().describe('Project slug (for push)'),
      space: z.string().optional().describe('Space slug (for push)'),
      branch: z.string().optional().describe('Branch name (for push)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const parsedKey = parseKeyArgument(args.key, args.namespace);
        const translationsPath = join(cwd, config.paths.translations);

        // Check if key already exists
        const exists = await keyExists(translationsPath, parsedKey, config);
        if (exists && !args.overwrite) {
          return textResult(`Error: Key "${parsedKey.userKey}" already exists. Use overwrite=true to update.`);
        }

        // Get all languages
        const languages = await getProjectLanguages(
          translationsPath,
          config.format.type,
          config.pull.filePattern
        );

        if (languages.length === 0) {
          return textResult(
            `Error: No translation files found in "${config.paths.translations}". Run lingx_pull first.`
          );
        }

        // Merge language-specific values with default value
        const values: Record<string, string> = {};

        // When overwriting, only update languages that are explicitly specified
        if (exists && args.overwrite) {
          // Only update specified languages
          if (args.values) {
            for (const [lang, val] of Object.entries(args.values)) {
              if (languages.includes(lang)) {
                values[lang] = val;
              }
            }
          } else if (args.value !== undefined) {
            // If single value provided, update all languages
            for (const lang of languages) {
              values[lang] = args.value;
            }
          }
        } else {
          // New key: set all languages
          for (const lang of languages) {
            if (args.values?.[lang] !== undefined) {
              values[lang] = args.values[lang];
            } else if (args.value !== undefined) {
              values[lang] = args.value;
            } else {
              values[lang] = '';
            }
          }
        }

        // Write to language files
        for (const [lang, val] of Object.entries(values)) {
          await writeKeyValue(translationsPath, parsedKey, lang, val, config);
        }

        // Regenerate types if enabled
        if (config.types?.enabled !== false) {
          await generateTypes({
            translationsPath: join(cwd, config.paths.translations),
            sourceLocale: config.types?.sourceLocale ?? 'en',
            outputPath: join(cwd, config.types?.output ?? './src/lingx.d.ts'),
            filePattern: config.pull.filePattern,
            nested: config.format.nested,
          });
        }

        // Push to API if requested
        if (args.push) {
          const project = args.project ?? config.project;
          const space = args.space ?? config.defaultSpace;
          const branch = args.branch ?? config.defaultBranch;

          if (!project || !space) {
            return jsonResult({
              success: true,
              key: parsedKey.userKey,
              languagesUpdated: languages.length,
              pushed: false,
              pushError: 'Project and space are required for push',
            });
          }

          const client = await createApiClientFromConfig(cwd);
          const { branchId } = await resolveBranchId(client, project, space, branch);

          const nonEmptyValues = Object.fromEntries(
            Object.entries(values).filter(([, v]) => v !== '')
          );

          await createKeyRemote(
            client,
            branchId,
            parsedKey.key,
            parsedKey.namespace,
            nonEmptyValues
          );

          return jsonResult({
            success: true,
            action: exists ? 'updated' : 'created',
            key: parsedKey.userKey,
            languagesUpdated: Object.keys(values).length,
            pushed: true,
          });
        }

        return jsonResult({
          success: true,
          action: exists ? 'updated' : 'created',
          key: parsedKey.userKey,
          languagesUpdated: Object.keys(values).length,
        });
      } catch (error) {
        return textResult(`Error adding key: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_key_remove - Remove a translation key
  server.tool(
    'lingx_key_remove',
    'Remove a translation key from local files. Optionally delete from remote.',
    {
      key: z.string().describe('Key name (supports namespace:key format)'),
      namespace: z.string().optional().describe('Namespace for the key'),
      push: z.boolean().optional().describe('Delete from remote API'),
      project: z.string().optional().describe('Project slug (for push)'),
      space: z.string().optional().describe('Space slug (for push)'),
      branch: z.string().optional().describe('Branch name (for push)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const parsedKey = parseKeyArgument(args.key, args.namespace);
        const translationsPath = join(cwd, config.paths.translations);

        // Check if key exists
        const exists = await keyExists(translationsPath, parsedKey, config);
        if (!exists) {
          return textResult(`Error: Key "${parsedKey.userKey}" not found in any language file`);
        }

        // Get all languages
        const languages = await getProjectLanguages(
          translationsPath,
          config.format.type,
          config.pull.filePattern
        );

        let removedCount = 0;

        // Remove from all language files
        for (const lang of languages) {
          const removed = await removeKeyFromFile(translationsPath, parsedKey, lang, config);
          if (removed) removedCount++;
        }

        // Clean up empty namespace directory
        if (parsedKey.namespace) {
          await cleanupEmptyNamespaceDir(translationsPath, parsedKey.namespace);
        }

        // Regenerate types if enabled
        if (config.types?.enabled !== false) {
          await generateTypes({
            translationsPath: join(cwd, config.paths.translations),
            sourceLocale: config.types?.sourceLocale ?? 'en',
            outputPath: join(cwd, config.types?.output ?? './src/lingx.d.ts'),
            filePattern: config.pull.filePattern,
            nested: config.format.nested,
          });
        }

        // Push deletion to API if requested
        if (args.push) {
          const project = args.project ?? config.project;
          const space = args.space ?? config.defaultSpace;
          const branch = args.branch ?? config.defaultBranch;

          if (!project || !space) {
            return jsonResult({
              success: true,
              key: parsedKey.userKey,
              languagesUpdated: removedCount,
              pushed: false,
              pushError: 'Project and space are required for push',
            });
          }

          const client = await createApiClientFromConfig(cwd);
          const { branchId } = await resolveBranchId(client, project, space, branch);

          const keyId = await findKeyId(client, branchId, parsedKey.key, parsedKey.namespace);

          if (keyId) {
            await deleteKeyRemote(client, keyId);
            return jsonResult({
              success: true,
              key: parsedKey.userKey,
              languagesUpdated: removedCount,
              pushed: true,
            });
          } else {
            return jsonResult({
              success: true,
              key: parsedKey.userKey,
              languagesUpdated: removedCount,
              pushed: false,
              pushNote: 'Key not found on server (may already be deleted)',
            });
          }
        }

        return jsonResult({
          success: true,
          key: parsedKey.userKey,
          languagesUpdated: removedCount,
        });
      } catch (error) {
        return textResult(`Error removing key: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_key_move - Move/rename a translation key
  server.tool(
    'lingx_key_move',
    'Move or rename a translation key, preserving all values across languages.',
    {
      source: z.string().describe('Source key (namespace:key format)'),
      target: z.string().describe('Target key (namespace:key format)'),
      push: z.boolean().optional().describe('Push changes to remote API'),
      project: z.string().optional().describe('Project slug (for push)'),
      space: z.string().optional().describe('Space slug (for push)'),
      branch: z.string().optional().describe('Branch name (for push)'),
      path: z.string().optional().describe('Project path (default: current working directory)'),
    },
    async (args) => {
      try {
        const cwd = args.path ?? process.cwd();
        const config = await loadConfig(cwd);
        const sourceKey = parseKeyArgument(args.source);
        const targetKey = parseKeyArgument(args.target);
        const translationsPath = join(cwd, config.paths.translations);

        // Check source and target
        if (sourceKey.userKey === targetKey.userKey) {
          return textResult('Error: Source and target keys are identical');
        }

        const sourceExists = await keyExists(translationsPath, sourceKey, config);
        if (!sourceExists) {
          return textResult(`Error: Source key "${sourceKey.userKey}" not found`);
        }

        const targetExists = await keyExists(translationsPath, targetKey, config);
        if (targetExists) {
          return textResult(`Error: Target key "${targetKey.userKey}" already exists`);
        }

        // Get current values
        const values = await readKeyValues(translationsPath, sourceKey, config);

        // Get all languages
        const languages = await getProjectLanguages(
          translationsPath,
          config.format.type,
          config.pull.filePattern
        );

        let movedCount = 0;

        // Move: write to target, remove from source
        for (const lang of languages) {
          const value = values[lang];
          if (value !== undefined) {
            await writeKeyValue(translationsPath, targetKey, lang, value, config);
            await removeKeyFromFile(translationsPath, sourceKey, lang, config);
            movedCount++;
          }
        }

        // Clean up empty namespace directory
        if (sourceKey.namespace) {
          await cleanupEmptyNamespaceDir(translationsPath, sourceKey.namespace);
        }

        // Regenerate types if enabled
        if (config.types?.enabled !== false) {
          await generateTypes({
            translationsPath: join(cwd, config.paths.translations),
            sourceLocale: config.types?.sourceLocale ?? 'en',
            outputPath: join(cwd, config.types?.output ?? './src/lingx.d.ts'),
            filePattern: config.pull.filePattern,
            nested: config.format.nested,
          });
        }

        // Push to API if requested
        if (args.push) {
          const project = args.project ?? config.project;
          const space = args.space ?? config.defaultSpace;
          const branch = args.branch ?? config.defaultBranch;

          if (!project || !space) {
            return jsonResult({
              success: true,
              from: sourceKey.userKey,
              to: targetKey.userKey,
              languagesMoved: movedCount,
              pushed: false,
              pushError: 'Project and space are required for push',
            });
          }

          const client = await createApiClientFromConfig(cwd);
          const { branchId } = await resolveBranchId(client, project, space, branch);

          const keyId = await findKeyId(client, branchId, sourceKey.key, sourceKey.namespace);

          if (keyId) {
            const updates: { name?: string; namespace?: string | null } = {};
            if (sourceKey.key !== targetKey.key) updates.name = targetKey.key;
            if (sourceKey.namespace !== targetKey.namespace) updates.namespace = targetKey.namespace;

            await updateKeyRemote(client, keyId, updates);

            // Update translations
            const nonEmptyValues = Object.fromEntries(
              Object.entries(values).filter(([, v]) => v !== undefined && v !== '')
            ) as Record<string, string>;

            if (Object.keys(nonEmptyValues).length > 0) {
              await updateKeyTranslationsRemote(client, keyId, nonEmptyValues);
            }

            return jsonResult({
              success: true,
              from: sourceKey.userKey,
              to: targetKey.userKey,
              languagesMoved: movedCount,
              pushed: true,
            });
          } else {
            return jsonResult({
              success: true,
              from: sourceKey.userKey,
              to: targetKey.userKey,
              languagesMoved: movedCount,
              pushed: false,
              pushNote: 'Key not found on server',
            });
          }
        }

        return jsonResult({
          success: true,
          from: sourceKey.userKey,
          to: targetKey.userKey,
          languagesMoved: movedCount,
        });
      } catch (error) {
        return textResult(`Error moving key: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
