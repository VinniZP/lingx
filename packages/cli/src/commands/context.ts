import { Command } from 'commander';
import { join, relative } from 'path';
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { createExtractor, type ExtractedKey } from '../lib/extractor/index.js';
import { createApiClientFromConfig } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';

interface ContextOptions {
  project?: string;
  space?: string;
  branch?: string;
  source?: string;
  dryRun?: boolean;
  semantic?: boolean;
  minSimilarity?: string;
}

interface KeyContextPayload {
  name: string;
  namespace: string | null;
  sourceFile: string | undefined;
  sourceLine: number | undefined;
  sourceComponent: string | undefined;
}

export function createContextCommand(): Command {
  return new Command('context')
    .description('Sync translation key context and relationships to the platform')
    .option('-p, --project <slug>', 'Project slug')
    .option('-s, --space <slug>', 'Space slug')
    .option('-b, --branch <name>', 'Branch name')
    .option('-S, --source <dir>', 'Source directory')
    .option('--dry-run', 'Show what would be synced without making changes')
    .option('--semantic', 'Trigger semantic relationship analysis (runs as background job)')
    .option('--min-similarity <value>', 'Minimum similarity for semantic matches (0.5-1.0)')
    .action(async (options: ContextOptions) => {
      try {
        await syncContext(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Context sync failed');
        process.exit(1);
      }
    });
}

async function syncContext(options: ContextOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  // Check if context is enabled
  if (config.context?.enabled === false) {
    logger.warn('Context detection is disabled in config. Enable with context.enabled: true');
    return;
  }

  // Resolve options with config defaults
  const project = options.project ?? config.project;
  const space = options.space ?? config.defaultSpace;
  const branch = options.branch ?? config.defaultBranch;
  const sourceDir = options.source ?? config.paths.source;
  const dryRun = options.dryRun ?? false;
  const runSemantic = options.semantic ?? config.context?.semanticAnalysis ?? false;
  const minSimilarity = options.minSimilarity
    ? parseFloat(options.minSimilarity)
    : config.context?.minSimilarity ?? 0.7;

  if (!project) {
    throw new Error('Project is required. Use --project or set in config file.');
  }
  if (!space) {
    throw new Error('Space is required. Use --space or set defaultSpace in config file.');
  }

  const spinner = createSpinner('Extracting key context...');
  spinner.start();

  try {
    // Create extractor
    const extractor = createExtractor(config.extract.framework, {
      functions: config.extract.functions,
      markerFunctions: config.extract.markerFunctions,
    });

    // Find source files
    const patterns = config.extract.patterns.map((p: string) =>
      join(sourceDir, p)
    );
    const files = await glob(patterns, {
      ignore: config.extract.exclude,
      absolute: true,
    });

    if (files.length === 0) {
      spinner.fail('No source files found');
      return;
    }

    spinner.text = `Processing ${files.length} files...`;

    // Extract keys with context from all files
    const allKeys: ExtractedKey[] = [];
    const extractionErrors: Array<{ file: string; message: string }> = [];

    for (const file of files) {
      const code = await readFile(file, 'utf-8');
      const result = extractor.extract(code, file);

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          extractionErrors.push({ file, message: error.message });
        }
      }

      allKeys.push(...result.keys);
    }

    // Show extraction errors as warnings (don't fail)
    if (extractionErrors.length > 0) {
      spinner.warn(`Found ${extractionErrors.length} extraction warnings`);
      for (const error of extractionErrors.slice(0, 5)) {
        logger.warn(`  ${error.file}: ${error.message}`);
      }
      if (extractionErrors.length > 5) {
        logger.warn(`  ... and ${extractionErrors.length - 5} more`);
      }
    }

    if (allKeys.length === 0) {
      spinner.succeed('No translation keys found');
      return;
    }

    // Build context payload
    const contextPayload: KeyContextPayload[] = [];
    const keyMap = new Map<string, KeyContextPayload>();

    for (const key of allKeys) {
      // Parse namespace from combined key (using U+001F delimiter)
      const delimiterIndex = key.key.indexOf('\u001F');
      const namespace = delimiterIndex >= 0 ? key.key.slice(0, delimiterIndex) : null;
      const name = delimiterIndex >= 0 ? key.key.slice(delimiterIndex + 1) : key.key;

      const mapKey = `${namespace ?? ''}:${name}`;

      // Only add if not already present (first occurrence wins)
      if (!keyMap.has(mapKey)) {
        const payload: KeyContextPayload = {
          name,
          namespace,
          sourceFile: key.location?.file
            ? relative(cwd, key.location.file)
            : undefined,
          sourceLine: key.location?.line,
          sourceComponent: key.componentContext?.name,
        };
        keyMap.set(mapKey, payload);
        contextPayload.push(payload);
      }
    }

    spinner.text = `Found ${contextPayload.length} unique keys with context`;

    // Count keys with component context
    const keysWithComponent = contextPayload.filter(k => k.sourceComponent).length;
    const keysWithFile = contextPayload.filter(k => k.sourceFile).length;

    if (dryRun) {
      spinner.succeed(`Dry run: Would sync context for ${contextPayload.length} keys`);
      logger.info(`  Keys with file info: ${keysWithFile}`);
      logger.info(`  Keys with component info: ${keysWithComponent}`);

      // Show sample of keys
      const sample = contextPayload.slice(0, 5);
      logger.info('\nSample keys:');
      for (const key of sample) {
        const ns = key.namespace ? `[${key.namespace}] ` : '';
        const comp = key.sourceComponent ? ` (${key.sourceComponent})` : '';
        const file = key.sourceFile ? ` in ${key.sourceFile}` : '';
        logger.info(`  ${ns}${key.name}${comp}${file}`);
      }
      if (contextPayload.length > 5) {
        logger.info(`  ... and ${contextPayload.length - 5} more`);
      }
      return;
    }

    // Send to API
    spinner.text = 'Syncing context to platform...';

    const client = await createApiClientFromConfig(cwd);

    // Get branch ID
    const spaces = await client.get<{ spaces: { id: string; slug: string }[] }>(
      `/api/projects/${project}/spaces`
    );

    const targetSpace = spaces.spaces.find(s => s.slug === space);
    if (!targetSpace) {
      throw new Error(`Space "${space}" not found in project "${project}"`);
    }

    const spaceDetails = await client.get<{ branches: { id: string; name: string }[] }>(
      `/api/spaces/${targetSpace.id}`
    );

    const targetBranch = spaceDetails.branches.find(b => b.name === branch);
    if (!targetBranch) {
      throw new Error(`Branch "${branch}" not found in space "${space}"`);
    }

    // Send in chunks of 1000 (API limit)
    const CHUNK_SIZE = 1000;
    let totalUpdated = 0;
    let totalNotFound = 0;

    const totalChunks = Math.ceil(contextPayload.length / CHUNK_SIZE);
    for (let i = 0; i < contextPayload.length; i += CHUNK_SIZE) {
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
      if (totalChunks > 1) {
        spinner.text = `Syncing context (batch ${chunkNum}/${totalChunks})...`;
      }

      const chunk = contextPayload.slice(i, i + CHUNK_SIZE);
      const result = await client.put<{ updated: number; notFound: number }>(
        `/api/branches/${targetBranch.id}/keys/context`,
        { keys: chunk }
      );
      totalUpdated += result.updated;
      totalNotFound += result.notFound;
    }

    spinner.succeed(
      `Context synced: ${totalUpdated} keys updated, ${totalNotFound} keys not found`
    );

    logger.info(`  Keys with file info: ${keysWithFile}`);
    logger.info(`  Keys with component info: ${keysWithComponent}`);

    // Trigger semantic analysis if requested
    if (runSemantic) {
      spinner.start('Triggering semantic relationship analysis...');

      try {
        const analysisResult = await client.post<{ jobId: string; status: string }>(
          `/api/branches/${targetBranch.id}/keys/analyze-relationships`,
          {
            types: ['SEMANTIC'],
            minSimilarity,
          }
        );

        spinner.succeed(
          `Semantic analysis queued (job: ${analysisResult.jobId})`
        );
      } catch (error) {
        spinner.warn(
          'Failed to trigger semantic analysis: ' +
            (error instanceof Error ? error.message : 'Unknown error')
        );
      }
    }
  } catch (error) {
    spinner.fail('Context sync failed');
    throw error;
  }
}

