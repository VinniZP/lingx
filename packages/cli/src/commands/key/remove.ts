import { Command } from 'commander';
import { join } from 'path';
import { confirm } from '@inquirer/prompts';
import { loadConfig } from '../../lib/config.js';
import { createApiClientFromConfig } from '../../lib/api.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';
import { regenerateTypesIfEnabled } from '../types.js';
import {
  parseKeyArgument,
  getProjectLanguages,
  keyExists,
  removeKeyFromFile,
  cleanupEmptyNamespaceDir,
  resolveBranchId,
  findKeyId,
  deleteKeyRemote,
} from './utils.js';
import chalk from 'chalk';

interface RemoveOptions {
  namespace?: string;
  push?: boolean;
  force?: boolean;
  project?: string;
  space?: string;
  branch?: string;
}

export function createKeyRemoveCommand(): Command {
  return new Command('remove')
    .description('Remove a translation key from local files')
    .argument('<key>', 'Key name (supports namespace:key format)')
    .option('-n, --namespace <ns>', 'Namespace for the key')
    .option('--push', 'Push deletion to remote API')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('-p, --project <slug>', 'Project slug (for --push)')
    .option('-s, --space <slug>', 'Space slug (for --push)')
    .option('-b, --branch <name>', 'Branch name (for --push)')
    .action(async (keyArg: string, options: RemoveOptions) => {
      try {
        await remove(keyArg, options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to remove key');
        process.exit(1);
      }
    });
}

async function remove(keyArg: string, options: RemoveOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Parse the key argument
  const parsedKey = parseKeyArgument(keyArg, options.namespace);

  const translationsPath = join(cwd, config.paths.translations);

  // Check if key exists
  const exists = await keyExists(translationsPath, parsedKey, config);
  if (!exists) {
    throw new Error(`Key "${parsedKey.userKey}" not found in any language file`);
  }

  // Get all languages
  const languages = await getProjectLanguages(
    translationsPath,
    config.format.type,
    config.pull.filePattern
  );

  // Confirm deletion unless --force
  if (!options.force) {
    const confirmed = await confirm({
      message: `Remove key "${chalk.cyan(parsedKey.userKey)}" from ${languages.length} language file(s)?`,
      default: false,
    });

    if (!confirmed) {
      logger.info('Cancelled');
      return;
    }
  }

  const spinner = createSpinner(`Removing key "${parsedKey.userKey}"...`);
  spinner.start();

  try {
    let removedCount = 0;

    // Remove from all language files
    for (const lang of languages) {
      const removed = await removeKeyFromFile(
        translationsPath,
        parsedKey,
        lang,
        config
      );
      if (removed) {
        removedCount++;
      }
    }

    // Clean up empty namespace directory if applicable
    if (parsedKey.namespace) {
      await cleanupEmptyNamespaceDir(translationsPath, parsedKey.namespace);
    }

    spinner.succeed(
      `Removed key "${chalk.cyan(parsedKey.userKey)}" from ${chalk.yellow(removedCount)} language file(s)`
    );

    // Regenerate types
    await regenerateTypesIfEnabled(cwd);

    // Push deletion to API if requested
    if (options.push) {
      await pushDeletionToApi(parsedKey, options, config, cwd);
    }
  } catch (error) {
    spinner.fail('Failed to remove key');
    throw error;
  }
}

async function pushDeletionToApi(
  parsedKey: ReturnType<typeof parseKeyArgument>,
  options: RemoveOptions,
  config: Awaited<ReturnType<typeof loadConfig>>,
  cwd: string
): Promise<void> {
  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const branch = options.branch ?? config.defaultBranch;

  if (!project) {
    throw new Error('Project is required for --push. Use -p or set in config.');
  }
  if (!space) {
    throw new Error('Space is required for --push. Use -s or set in config.');
  }

  const spinner = createSpinner('Deleting from API...');
  spinner.start();

  try {
    const client = await createApiClientFromConfig(cwd);
    const { branchId } = await resolveBranchId(client, project, space, branch);

    // Find the key ID
    const keyId = await findKeyId(
      client,
      branchId,
      parsedKey.key,
      parsedKey.namespace
    );

    if (!keyId) {
      spinner.warn(`Key "${parsedKey.userKey}" not found on server (may already be deleted)`);
      return;
    }

    await deleteKeyRemote(client, keyId);

    spinner.succeed(`Deleted key "${chalk.cyan(parsedKey.userKey)}" from API`);
  } catch (error) {
    spinner.fail('Failed to delete from API');
    throw error;
  }
}
