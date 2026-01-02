import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { join } from 'path';
import { loadConfig, getConfigPath } from '../../lib/config.js';
import { getProjectLanguages } from '../../commands/key/utils.js';
import { readAllTranslations } from '../utils.js';

// Note: join is still used in getProjectLanguages call

/**
 * Register MCP resources for Lingx.
 */
export function registerResources(server: McpServer): void {
  const cwd = process.cwd();

  // lingx://config - Current project configuration
  server.resource(
    'config',
    'lingx://config',
    { description: 'Current Lingx project configuration', mimeType: 'application/json' },
    async () => {
      try {
        const config = await loadConfig(cwd);
        const configPath = getConfigPath(cwd);

        return {
          contents: [
            {
              uri: 'lingx://config',
              mimeType: 'application/json',
              text: JSON.stringify({ config, configPath }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: 'lingx://config',
              mimeType: 'application/json',
              text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
            },
          ],
        };
      }
    }
  );

  // lingx://keys - List all translation keys
  server.resource(
    'keys',
    'lingx://keys',
    { description: 'List of all translation keys with metadata', mimeType: 'application/json' },
    async () => {
      try {
        const config = await loadConfig(cwd);
        const translations = await readAllTranslations(cwd);

        const sourceLocale = config.types?.sourceLocale ?? 'en';
        const sourceTranslations = translations[sourceLocale] ?? {};
        const allLanguages = Object.keys(translations);

        const keys = Object.keys(sourceTranslations).map((key) => {
          // Count how many languages have this key
          const languagesWithKey = allLanguages.filter(
            (lang) => translations[lang]?.[key] !== undefined
          );

          return {
            key,
            coverage: `${languagesWithKey.length}/${allLanguages.length}`,
            sourceValue: sourceTranslations[key],
          };
        });

        return {
          contents: [
            {
              uri: 'lingx://keys',
              mimeType: 'application/json',
              text: JSON.stringify({
                totalKeys: keys.length,
                languages: allLanguages,
                keys,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: 'lingx://keys',
              mimeType: 'application/json',
              text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
            },
          ],
        };
      }
    }
  );

  // lingx://translations/{language} - Translation file contents
  server.resource(
    'translations',
    new ResourceTemplate('lingx://translations/{language}', {
      list: async () => {
        try {
          const config = await loadConfig(cwd);
          const languages = await getProjectLanguages(
            join(cwd, config.paths.translations),
            config.format.type,
            config.pull.filePattern
          );

          return {
            resources: languages.map((lang) => ({
              uri: `lingx://translations/${lang}`,
              name: `Translations (${lang})`,
              description: `Translation file for ${lang}`,
              mimeType: 'application/json',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    { description: 'Translation files by language', mimeType: 'application/json' },
    async (uri, variables) => {
      try {
        const language = variables.language as string;
        const translations = await readAllTranslations(cwd);

        const langTranslations = translations[language];
        if (!langTranslations) {
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: 'application/json',
                text: JSON.stringify({ error: `Language "${language}" not found` }),
              },
            ],
          };
        }

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({
                language,
                keyCount: Object.keys(langTranslations).length,
                translations: langTranslations,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
            },
          ],
        };
      }
    }
  );
}
