/**
 * Activity Worker
 *
 * Processes activity logging jobs from BullMQ queue.
 * Implements sequential session-based grouping per ADR-0005:
 * - Consecutive same-type activities are merged
 * - Group breaks on: type change or 15-minute gap
 *
 * This worker handles the "heavy lifting" of activity tracking,
 * keeping the API request path fast (~1-2ms queue publish).
 */
import type { ActivityMetadata, CreateActivityInput } from '@lingx/shared';
import { ActivityType, Prisma, PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { ActivityService, MAX_PREVIEW_ITEMS } from '../services/activity.service.js';

interface ActivityJobData extends CreateActivityInput {
  timestamp: number;
}

/**
 * Create the activity worker
 */
export function createActivityWorker(prisma: PrismaClient): Worker {
  const worker = new Worker<ActivityJobData>(
    'activity',
    async (job: Job<ActivityJobData>) => {
      const data = job.data;

      // Validate activity type
      const activityType = data.type as ActivityType;
      if (!Object.values(ActivityType).includes(activityType)) {
        console.error(`[ActivityWorker] Invalid activity type: ${data.type}`);
        return;
      }

      // Generate group key
      const timestamp = new Date(data.timestamp);
      const groupKey = ActivityService.generateGroupKey(
        data.userId,
        data.projectId,
        data.type,
        data.branchId,
        timestamp
      );

      // Build preview from changes
      const { preview, hasMore } = ActivityService.buildPreview(data.changes);

      // Merge metadata with preview
      const metadata: ActivityMetadata = {
        ...data.metadata,
        preview,
        hasMore,
      };

      // Extract unique languages from changes for translation activities
      if (activityType === ActivityType.translation && data.changes.length > 0) {
        const languages = [
          ...new Set(data.changes.filter((c) => c.language).map((c) => c.language as string)),
        ];
        if (languages.length > 0) {
          metadata.languages = languages;
        }
      }

      // Use transaction with retry for race condition handling
      // Two concurrent jobs with same groupKey can race: both find nothing, both try to create
      const MAX_RETRIES = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await prisma.$transaction(async (tx) => {
            // Always check for existing activity with same group key
            // This handles both groupable types (intentional merging) and
            // race conditions for non-groupable types (concurrent jobs with same 30s window)
            const existingActivity = await tx.activity.findUnique({
              where: { groupKey },
              include: { changes: true },
            });

            if (existingActivity) {
              // Update existing grouped activity
              const existingMeta = existingActivity.metadata as ActivityMetadata;

              // Merge languages
              const mergedLanguages = [
                ...new Set([...(existingMeta.languages || []), ...(metadata.languages || [])]),
              ];

              // Merge preview (keep first MAX_PREVIEW_ITEMS)
              const mergedPreview = [...(existingMeta.preview || []), ...(preview || [])].slice(
                0,
                MAX_PREVIEW_ITEMS
              );

              const newCount = existingActivity.count + data.changes.length;

              await tx.activity.update({
                where: { id: existingActivity.id },
                data: {
                  count: newCount,
                  metadata: {
                    ...existingMeta,
                    ...metadata,
                    languages: mergedLanguages.length > 0 ? mergedLanguages : undefined,
                    preview: mergedPreview,
                    hasMore:
                      newCount > MAX_PREVIEW_ITEMS ||
                      existingActivity.changes.length + data.changes.length > MAX_PREVIEW_ITEMS,
                  } as unknown as Prisma.InputJsonValue,
                },
              });

              // Add new changes to the activity
              if (data.changes.length > 0) {
                await tx.activityChange.createMany({
                  data: data.changes.map((c) => ({
                    activityId: existingActivity.id,
                    entityType: c.entityType,
                    entityId: c.entityId,
                    keyName: c.keyName,
                    language: c.language,
                    oldValue: c.oldValue,
                    newValue: c.newValue,
                  })),
                });
              }
            } else {
              // Create new activity
              const activity = await tx.activity.create({
                data: {
                  projectId: data.projectId,
                  branchId: data.branchId,
                  userId: data.userId,
                  type: activityType,
                  metadata: metadata as Prisma.InputJsonValue,
                  count: data.changes.length || 1,
                  groupKey,
                },
              });

              // Add changes
              if (data.changes.length > 0) {
                await tx.activityChange.createMany({
                  data: data.changes.map((c) => ({
                    activityId: activity.id,
                    entityType: c.entityType,
                    entityId: c.entityId,
                    keyName: c.keyName,
                    language: c.language,
                    oldValue: c.oldValue,
                    newValue: c.newValue,
                  })),
                });
              }
            }
          });

          // Success - exit retry loop
          lastError = null;
          break;
        } catch (error) {
          lastError = error as Error;

          // Check if it's a unique constraint violation (P2002)
          const isPrismaUniqueError =
            error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

          if (isPrismaUniqueError && attempt < MAX_RETRIES) {
            // Retry - the activity now exists, next attempt will find and update it
            console.log(
              `[ActivityWorker] Race condition detected for groupKey ${groupKey}, retrying (${attempt}/${MAX_RETRIES})`
            );
            continue;
          }

          // Non-retryable error or max retries exceeded
          throw error;
        }
      }

      if (lastError) {
        throw lastError;
      }

      console.log(
        `[ActivityWorker] Processed activity: ${data.type} for project ${data.projectId}`
      );
    },
    {
      connection: redis,
      concurrency: 5, // Process 5 jobs concurrently
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[ActivityWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[ActivityWorker] Worker error:', err.message);
  });

  return worker;
}
