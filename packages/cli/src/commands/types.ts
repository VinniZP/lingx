import { Command } from 'commander';
import { join, relative } from 'path';
import { watch } from 'chokidar';
import { loadConfig } from '../lib/config.js';
import { generateTypes } from '../lib/type-generator/index.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import chalk from 'chalk';

interface TypesOptions {
  output?: string;
  locale?: string;
  watch?: boolean;
}

export function createTypesCommand(): Command {
  return new Command('types')
    .description('Generate TypeScript types from translation files')
    .option('-o, --output <file>', 'Output file path (overrides config)')
    .option('-l, --locale <code>', 'Source locale to use (overrides config)')
    .option('-w, --watch', 'Watch for changes and regenerate')
    .action(async (options: TypesOptions) => {
      try {
        await types(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Type generation failed');
        process.exit(1);
      }
    });
}

async function types(options: TypesOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Check if types config exists and is enabled
  if (config.types && !config.types.enabled) {
    logger.warn('Type generation is disabled in config');
    return;
  }

  // Resolve options with config defaults
  const typesConfig = config.types ?? {
    enabled: true,
    output: './src/localeflow.d.ts',
    sourceLocale: 'en',
  };

  const outputPath = options.output ?? typesConfig.output;
  const sourceLocale = options.locale ?? typesConfig.sourceLocale;
  const translationsPath = config.paths.translations;
  const filePattern = config.pull.filePattern;
  const nested = config.format.nested;

  // Generate types once
  await runTypeGeneration({
    cwd,
    translationsPath,
    sourceLocale,
    outputPath,
    filePattern,
    nested,
  });

  // Watch mode
  if (options.watch) {
    const watchPattern = join(cwd, translationsPath, '**/*.json');
    logger.info(`Watching for changes: ${relative(cwd, watchPattern)}`);

    const watcher = watch(watchPattern, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    watcher.on('change', async (changedPath) => {
      logger.info(`File changed: ${relative(cwd, changedPath)}`);
      try {
        await runTypeGeneration({
          cwd,
          translationsPath,
          sourceLocale,
          outputPath,
          filePattern,
          nested,
        });
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Regeneration failed');
      }
    });

    watcher.on('add', async (addedPath) => {
      logger.info(`File added: ${relative(cwd, addedPath)}`);
      try {
        await runTypeGeneration({
          cwd,
          translationsPath,
          sourceLocale,
          outputPath,
          filePattern,
          nested,
        });
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Regeneration failed');
      }
    });

    // Keep process running
    process.on('SIGINT', () => {
      watcher.close();
      process.exit(0);
    });

    // Wait forever
    await new Promise(() => {});
  }
}

interface GenerationOptions {
  cwd: string;
  translationsPath: string;
  sourceLocale: string;
  outputPath: string;
  filePattern: string;
  nested: boolean;
}

async function runTypeGeneration(options: GenerationOptions): Promise<void> {
  const spinner = createSpinner('Generating TypeScript types...');
  spinner.start();

  try {
    const result = await generateTypes({
      translationsPath: join(options.cwd, options.translationsPath),
      sourceLocale: options.sourceLocale,
      outputPath: join(options.cwd, options.outputPath),
      filePattern: options.filePattern,
      nested: options.nested,
    });

    spinner.succeed(
      `Generated types: ${chalk.cyan(result.keyCount)} keys (${chalk.yellow(result.keysWithParams)} with params)`
    );
    logger.info(`Output: ${relative(options.cwd, result.outputPath)}`);
  } catch (error) {
    spinner.fail('Type generation failed');
    throw error;
  }
}

/**
 * Helper function to regenerate types if enabled in config.
 * Called by other commands (extract, pull, push, sync) after their operations.
 */
export async function regenerateTypesIfEnabled(cwd: string): Promise<void> {
  const config = await loadConfig(cwd);

  if (!config.types?.enabled) {
    return;
  }

  const typesConfig = config.types;

  try {
    const result = await generateTypes({
      translationsPath: join(cwd, config.paths.translations),
      sourceLocale: typesConfig.sourceLocale,
      outputPath: join(cwd, typesConfig.output),
      filePattern: config.pull.filePattern,
      nested: config.format.nested,
    });

    logger.info(
      `Types regenerated: ${result.keyCount} keys (${result.keysWithParams} with params)`
    );
  } catch (error) {
    // Log but don't fail the parent command
    logger.warn(
      `Failed to regenerate types: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
