/**
 * Glossary Worker
 *
 * Processes async glossary operations:
 * - Usage tracking (record when terms are applied)
 * - Import processing (CSV/TBX)
 * - MT provider sync (DeepL/Google glossary API)
 */
import { Worker, Job } from 'bullmq';
import { PrismaClient, MTProvider } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { GlossaryService } from '../services/glossary.service.js';
import { MTService } from '../services/mt.service.js';

export type GlossaryJobType =
  | 'record-usage'
  | 'import'
  | 'sync-provider'
  | 'delete-provider-glossary';

export interface GlossaryJobData {
  type: GlossaryJobType;
  projectId: string;

  // Usage tracking
  entryId?: string;

  // Import specific
  format?: 'csv' | 'tbx';
  content?: string;
  overwrite?: boolean;
  userId?: string;

  // Sync specific
  provider?: MTProvider;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export function createGlossaryWorker(prisma: PrismaClient): Worker {
  const glossaryService = new GlossaryService(prisma);

  const worker = new Worker<GlossaryJobData>(
    'glossary',
    async (job: Job<GlossaryJobData>) => {
      const { type } = job.data;

      console.log(`[GlossaryWorker] Processing job ${job.id}: ${type}`);

      switch (type) {
        case 'record-usage':
          return handleRecordUsage(glossaryService, job.data);

        case 'import':
          return handleImport(glossaryService, job.data);

        case 'sync-provider':
          return handleProviderSync(prisma, glossaryService, job.data);

        case 'delete-provider-glossary':
          return handleDeleteProviderGlossary(prisma, job.data);

        default:
          console.warn(`[GlossaryWorker] Unknown job type: ${type}`);
      }
    },
    {
      connection: redis,
      concurrency: 2, // Limited due to external API calls
    }
  );

  worker.on('completed', (job) => {
    console.log(`[GlossaryWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[GlossaryWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
}

/**
 * Record usage when a glossary term is applied
 */
async function handleRecordUsage(
  service: GlossaryService,
  data: GlossaryJobData
): Promise<void> {
  const { entryId } = data;

  if (!entryId) {
    console.warn('[GlossaryWorker] record-usage: Missing entryId');
    return;
  }

  try {
    await service.recordUsage(entryId);
  } catch (error) {
    console.error('[GlossaryWorker] record-usage failed:', error);
    // Don't throw - usage tracking is non-critical
  }
}

/**
 * Process bulk import from CSV or TBX
 */
async function handleImport(
  service: GlossaryService,
  data: GlossaryJobData
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const { projectId, format, content, overwrite, userId } = data;

  if (!format || !content) {
    return { imported: 0, skipped: 0, errors: ['Missing format or content'] };
  }

  if (format === 'csv') {
    return service.importFromCSV(projectId, content, overwrite ?? false, userId);
  } else {
    return service.importFromTBX(projectId, content, overwrite ?? false, userId);
  }
}

/**
 * Sync glossary to MT provider
 */
async function handleProviderSync(
  prisma: PrismaClient,
  glossaryService: GlossaryService,
  data: GlossaryJobData
): Promise<void> {
  const { projectId, provider, sourceLanguage, targetLanguage } = data;

  if (!provider || !sourceLanguage || !targetLanguage) {
    console.warn('[GlossaryWorker] sync-provider: Missing required parameters');
    return;
  }

  try {
    // Mark as pending
    await prisma.glossaryProviderSync.upsert({
      where: {
        projectId_provider_sourceLanguage_targetLanguage: {
          projectId,
          provider,
          sourceLanguage,
          targetLanguage,
        },
      },
      update: {
        syncStatus: 'pending',
        syncError: null,
      },
      create: {
        projectId,
        provider,
        sourceLanguage,
        targetLanguage,
        externalGlossaryId: '', // Will be set after sync
        lastSyncedAt: new Date(),
        syncStatus: 'pending',
      },
    });

    // Get entries for this language pair
    const entries = await glossaryService.prepareForProviderSync(
      projectId,
      sourceLanguage,
      targetLanguage
    );

    if (entries.length === 0) {
      await prisma.glossaryProviderSync.update({
        where: {
          projectId_provider_sourceLanguage_targetLanguage: {
            projectId,
            provider,
            sourceLanguage,
            targetLanguage,
          },
        },
        data: {
          syncStatus: 'synced',
          entriesCount: 0,
          lastSyncedAt: new Date(),
        },
      });
      console.log('[GlossaryWorker] No entries to sync');
      return;
    }

    // Get MT config for this provider
    const mtConfig = await prisma.machineTranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider,
        },
      },
    });

    if (!mtConfig) {
      throw new Error(`No MT configuration found for provider ${provider}`);
    }

    // Create MT service and sync glossary
    const mtService = new MTService(prisma);

    // Check if we have an existing glossary
    const existingSync = await prisma.glossaryProviderSync.findUnique({
      where: {
        projectId_provider_sourceLanguage_targetLanguage: {
          projectId,
          provider,
          sourceLanguage,
          targetLanguage,
        },
      },
    });

    // Delete existing glossary if it exists (providers don't support update)
    if (existingSync?.externalGlossaryId) {
      try {
        await mtService.deleteGlossary(projectId, provider, existingSync.externalGlossaryId);
      } catch (error) {
        console.warn('[GlossaryWorker] Failed to delete existing glossary:', error);
        // Continue anyway - may not exist on provider
      }
    }

    // Create new glossary on provider
    const glossaryName = `LocaleFlow-${projectId.slice(-8)}-${sourceLanguage}-${targetLanguage}`;
    const externalGlossaryId = await mtService.createGlossary(
      projectId,
      provider,
      glossaryName,
      sourceLanguage,
      targetLanguage,
      entries
    );

    // Update sync record
    await prisma.glossaryProviderSync.update({
      where: {
        projectId_provider_sourceLanguage_targetLanguage: {
          projectId,
          provider,
          sourceLanguage,
          targetLanguage,
        },
      },
      data: {
        externalGlossaryId,
        entriesCount: entries.length,
        lastSyncedAt: new Date(),
        syncStatus: 'synced',
        syncError: null,
      },
    });

    console.log(
      `[GlossaryWorker] Synced ${entries.length} entries to ${provider} glossary ${externalGlossaryId}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GlossaryWorker] sync-provider failed:', error);

    // Update sync status with error
    await prisma.glossaryProviderSync.upsert({
      where: {
        projectId_provider_sourceLanguage_targetLanguage: {
          projectId,
          provider,
          sourceLanguage,
          targetLanguage,
        },
      },
      update: {
        syncStatus: 'error',
        syncError: errorMessage,
      },
      create: {
        projectId,
        provider,
        sourceLanguage,
        targetLanguage,
        externalGlossaryId: '',
        lastSyncedAt: new Date(),
        syncStatus: 'error',
        syncError: errorMessage,
      },
    });

    throw error;
  }
}

/**
 * Delete glossary from MT provider
 */
async function handleDeleteProviderGlossary(
  prisma: PrismaClient,
  data: GlossaryJobData
): Promise<void> {
  const { projectId, provider, sourceLanguage, targetLanguage } = data;

  if (!provider || !sourceLanguage || !targetLanguage) {
    console.warn('[GlossaryWorker] delete-provider-glossary: Missing required parameters');
    return;
  }

  try {
    // Get existing sync record
    const sync = await prisma.glossaryProviderSync.findUnique({
      where: {
        projectId_provider_sourceLanguage_targetLanguage: {
          projectId,
          provider,
          sourceLanguage,
          targetLanguage,
        },
      },
    });

    if (!sync?.externalGlossaryId) {
      console.log('[GlossaryWorker] No external glossary to delete');
      return;
    }

    // Delete from provider
    const mtService = new MTService(prisma);
    await mtService.deleteGlossary(projectId, provider, sync.externalGlossaryId);

    // Delete sync record
    await prisma.glossaryProviderSync.delete({
      where: {
        projectId_provider_sourceLanguage_targetLanguage: {
          projectId,
          provider,
          sourceLanguage,
          targetLanguage,
        },
      },
    });

    console.log(
      `[GlossaryWorker] Deleted ${provider} glossary ${sync.externalGlossaryId}`
    );
  } catch (error) {
    console.error('[GlossaryWorker] delete-provider-glossary failed:', error);
    throw error;
  }
}
