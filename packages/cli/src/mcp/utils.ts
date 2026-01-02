import { join } from 'path';
import { loadConfig } from '../lib/config.js';
import { createFormatter } from '../lib/formatter/index.js';
import { readTranslationFilesWithNamespaces } from '../lib/translation-io.js';

/**
 * Read all translation files from the configured translations directory.
 * Returns a map of language code to translations (with namespace-prefixed keys).
 */
export async function readAllTranslations(
  cwd: string
): Promise<Record<string, Record<string, string>>> {
  const config = await loadConfig(cwd);
  const formatter = createFormatter(config.format.type, {
    nested: config.format.nested,
    indentation: config.format.indentation,
  });

  return readTranslationFilesWithNamespaces(
    join(cwd, config.paths.translations),
    config.format.type,
    formatter,
    config.pull.filePattern
  );
}
