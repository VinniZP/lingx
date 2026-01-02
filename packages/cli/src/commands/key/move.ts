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
  readKeyValues,
  writeKeyValue,
  removeKeyFromFile,
  cleanupEmptyNamespaceDir,
  resolveBranchId,
  findKeyId,
  updateKeyRemote,
  updateKeyTranslationsRemote,
} from './utils.js';
import chalk from 'chalk';

interface MoveOptions {
  push?: boolean;
  force?: boolean;
  project?: string;
  space?: string;
  branch?: string;
}

export function createKeyMoveCommand(): Command {
  return new Command('move')
    .description('Move/rename a translation key preserving all values')
    .argument('<source>', 'Source key (supports namespace:key format)')
    .argument('<target>', 'Target key (supports namespace:key format)')
    .option('--push', 'Push changes to remote API')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('-p, --project <slug>', 'Project slug (for --push)')
    .option('-s, --space <slug>', 'Space slug (for --push)')
    .option('-b, --branch <name>', 'Branch name (for --push)')
    .action(async (sourceArg: string, targetArg: string, options: MoveOptions) => {
      try {
        await move(sourceArg, targetArg, options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to move key');
        process.exit(1);
      }
    });
}

async function move(
  sourceArg: string,
  targetArg: string,
  options: MoveOptions
): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Parse source and target keys
  const sourceKey = parseKeyArgument(sourceArg);
  const targetKey = parseKeyArgument(targetArg);

  // Check if source and target are the same
  if (sourceKey.userKey === targetKey.userKey) {
    throw new Error('Source and target keys are identical');
  }

  const translationsPath = join(cwd, config.paths.translations);

  // Check source exists
  const sourceExists = await keyExists(translationsPath, sourceKey, config);
  if (!sourceExists) {
    throw new Error(`Source key "${sourceKey.userKey}" not found in any language file`);
  }

  // Check target doesn't exist
  const targetExists = await keyExists(translationsPath, targetKey, config);
  if (targetExists) {
    throw new Error(`Target key "${targetKey.userKey}" already exists`);
  }

  // Determine move type for display
  const moveType = getMoveType(sourceKey, targetKey);

  // Confirm move unless --force
  if (!options.force) {
    const confirmed = await confirm({
      message: `${moveType}: "${chalk.yellow(sourceKey.userKey)}" → "${chalk.cyan(targetKey.userKey)}"?`,
      default: true,
    });

    if (!confirmed) {
      logger.info('Cancelled');
      return;
    }
  }

  const spinner = createSpinner(`Moving key...`);
  spinner.start();

  try {
    // Get all current values
    const values = await readKeyValues(translationsPath, sourceKey, config);

    // Get all languages
    const languages = await getProjectLanguages(
      translationsPath,
      config.format.type,
      config.pull.filePattern
    );

    let movedCount = 0;

    // For each language: write to target, remove from source
    for (const lang of languages) {
      const value = values[lang];
      if (value !== undefined) {
        // Write to target location
        await writeKeyValue(translationsPath, targetKey, lang, value, config);
        // Remove from source location
        await removeKeyFromFile(translationsPath, sourceKey, lang, config);
        movedCount++;
      }
    }

    // Clean up empty namespace directory if source had a namespace
    if (sourceKey.namespace) {
      await cleanupEmptyNamespaceDir(translationsPath, sourceKey.namespace);
    }

    spinner.succeed(
      `Moved "${chalk.yellow(sourceKey.userKey)}" → "${chalk.cyan(targetKey.userKey)}" (${chalk.yellow(movedCount)} language(s))`
    );

    // Regenerate types
    await regenerateTypesIfEnabled(cwd);

    // Push to API if requested
    if (options.push) {
      await pushMoveToApi(sourceKey, targetKey, values, options, config, cwd);
    }
  } catch (error) {
    spinner.fail('Failed to move key');
    throw error;
  }
}

function getMoveType(
  source: ReturnType<typeof parseKeyArgument>,
  target: ReturnType<typeof parseKeyArgument>
): string {
  if (source.namespace === target.namespace) {
    return 'Rename';
  }
  if (source.namespace === null && target.namespace !== null) {
    return 'Move to namespace';
  }
  if (source.namespace !== null && target.namespace === null) {
    return 'Move to root';
  }
  return 'Move between namespaces';
}

async function pushMoveToApi(
  sourceKey: ReturnType<typeof parseKeyArgument>,
  targetKey: ReturnType<typeof parseKeyArgument>,
  values: Record<string, string | undefined>,
  options: MoveOptions,
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

  const spinner = createSpinner('Updating API...');
  spinner.start();

  try {
    const client = await createApiClientFromConfig(cwd);
    const { branchId } = await resolveBranchId(client, project, space, branch);

    // Find the source key ID
    const keyId = await findKeyId(
      client,
      branchId,
      sourceKey.key,
      sourceKey.namespace
    );

    if (!keyId) {
      spinner.warn(`Key "${sourceKey.userKey}" not found on server`);
      return;
    }

    // Update key name and/or namespace
    const updates: { name?: string; namespace?: string | null } = {};

    if (sourceKey.key !== targetKey.key) {
      updates.name = targetKey.key;
    }

    if (sourceKey.namespace !== targetKey.namespace) {
      updates.namespace = targetKey.namespace;
    }

    await updateKeyRemote(client, keyId, updates);

    // Also update translations if any values exist
    const nonEmptyValues = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined && v !== '')
    ) as Record<string, string>;

    if (Object.keys(nonEmptyValues).length > 0) {
      await updateKeyTranslationsRemote(client, keyId, nonEmptyValues);
    }

    spinner.succeed(
      `Moved "${chalk.yellow(sourceKey.userKey)}" → "${chalk.cyan(targetKey.userKey)}" on API`
    );
  } catch (error) {
    spinner.fail('Failed to update API');
    throw error;
  }
}
