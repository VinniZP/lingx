/**
 * Retention Worker
 *
 * Scheduled job for cleaning up old activities per ADR-0005.
 * Runs daily at 3 AM to delete activities older than each
 * project's configured retention period.
 *
 * Uses batch deletion to avoid long database locks.
 */
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { retentionQueue } from '../lib/queues.js';

/**
 * Batch size for deletion (avoid long locks)
 */
const DELETE_BATCH_SIZE = 1000;

/**
 * Number of projects to process per batch
 */
const PROJECT_BATCH_SIZE = 10;

/**
 * Create the retention worker
 */
export function createRetentionWorker(prisma: PrismaClient): Worker {
  const worker = new Worker(
    'retention',
    async (_job: Job) => {
      console.log('[RetentionWorker] Starting activity cleanup');

      const startTime = Date.now();
      let totalDeleted = 0;
      let projectsProcessed = 0;

      // Get all projects with their retention settings
      const projects = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
          activityRetentionDays: true,
        },
      });

      // Process projects in batches
      for (let i = 0; i < projects.length; i += PROJECT_BATCH_SIZE) {
        const batch = projects.slice(i, i + PROJECT_BATCH_SIZE);

        await Promise.all(
          batch.map(async (project) => {
            const cutoffDate = new Date();
            cutoffDate.setDate(
              cutoffDate.getDate() - project.activityRetentionDays
            );

            let deletedInProject = 0;
            let batchDeleted = 0;

            // Delete in batches
            do {
              // First delete ActivityChange records (cascade doesn't work with deleteMany batching)
              const activitiesToDelete = await prisma.activity.findMany({
                where: {
                  projectId: project.id,
                  createdAt: { lt: cutoffDate },
                },
                select: { id: true },
                take: DELETE_BATCH_SIZE,
              });

              if (activitiesToDelete.length === 0) {
                break;
              }

              const activityIds = activitiesToDelete.map((a) => a.id);

              // Delete changes first (foreign key constraint)
              await prisma.activityChange.deleteMany({
                where: { activityId: { in: activityIds } },
              });

              // Then delete activities
              const result = await prisma.activity.deleteMany({
                where: { id: { in: activityIds } },
              });

              batchDeleted = result.count;
              deletedInProject += batchDeleted;
            } while (batchDeleted === DELETE_BATCH_SIZE);

            if (deletedInProject > 0) {
              console.log(
                `[RetentionWorker] Deleted ${deletedInProject} activities from project "${project.name}"`
              );
            }

            totalDeleted += deletedInProject;
            projectsProcessed++;
          })
        );
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `[RetentionWorker] Cleanup complete: ${totalDeleted} activities deleted from ${projectsProcessed} projects in ${duration}s`
      );
    },
    {
      connection: redis,
      concurrency: 1, // Only one cleanup job at a time
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[RetentionWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[RetentionWorker] Worker error:', err.message);
  });

  return worker;
}

/**
 * Register the retention cleanup job to run daily at 3 AM
 */
export async function registerRetentionJob(): Promise<void> {
  // Remove any existing job first
  const existingJobs = await retentionQueue.getRepeatableJobs();
  for (const job of existingJobs) {
    if (job.id === 'activity-retention-cleanup') {
      await retentionQueue.removeRepeatableByKey(job.key);
    }
  }

  // Schedule new repeatable job
  await retentionQueue.add(
    'cleanup',
    {},
    {
      repeat: {
        pattern: '0 3 * * *', // Daily at 3 AM
      },
      jobId: 'activity-retention-cleanup',
    }
  );

  console.log('[RetentionWorker] Scheduled daily cleanup job at 3 AM');
}
