/**
 * Job Routes
 *
 * Handles job status, SSE progress streaming, and job cancellation.
 * Used for background task progress updates (e.g., bulk translations).
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { mtBatchQueue } from '../lib/queues.js';
import { mtBatchQueueEvents } from '../lib/queue-events.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';
import type { BulkTranslateProgress } from '../workers/mt-batch.worker.js';

/**
 * SSE event types
 */
type SSEEventType = 'connected' | 'progress' | 'completed' | 'failed';

interface SSEEvent {
  type: SSEEventType;
  jobId: string;
  data?: unknown;
}

/**
 * Job status response
 */
const jobStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']),
  progress: z.object({
    total: z.number(),
    processed: z.number(),
    translated: z.number(),
    skipped: z.number(),
    failed: z.number(),
    currentKey: z.string().optional(),
    currentLang: z.string().optional(),
  }).optional(),
  result: z.object({
    translated: z.number(),
    skipped: z.number(),
    failed: z.number(),
    errors: z.array(z.object({
      keyId: z.string(),
      keyName: z.string(),
      language: z.string(),
      error: z.string(),
    })).optional(),
  }).optional(),
  failedReason: z.string().optional(),
  createdAt: z.string(),
  finishedAt: z.string().optional(),
});

const jobRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/jobs/:jobId - Get job status
   */
  app.get(
    '/api/jobs/:jobId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get job status and progress',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          jobId: z.string(),
        }),
        response: {
          200: jobStatusSchema,
        },
      },
    },
    async (request, _reply) => {
      const { jobId } = request.params;

      const job = await mtBatchQueue.getJob(jobId);
      if (!job) {
        throw new NotFoundError('Job');
      }

      // Verify user owns the job
      if (job.data.userId !== request.user.userId) {
        throw new ForbiddenError('Not authorized to view this job');
      }

      const state = await job.getState();
      const progress = job.progress as BulkTranslateProgress | undefined;

      return {
        id: job.id!,
        name: job.name,
        status: state as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
        progress: progress ? {
          total: progress.total,
          processed: progress.processed,
          translated: progress.translated,
          skipped: progress.skipped,
          failed: progress.failed,
          currentKey: progress.currentKey,
          currentLang: progress.currentLang,
        } : undefined,
        result: job.returnvalue ? (job.returnvalue as { translated: number; skipped: number; failed: number; errors?: Array<{ keyId: string; keyName: string; language: string; error: string }> }) : undefined,
        failedReason: job.failedReason ?? undefined,
        createdAt: new Date(job.timestamp).toISOString(),
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
      };
    }
  );

  /**
   * GET /api/jobs/:jobId/events - SSE endpoint for job progress
   */
  app.get(
    '/api/jobs/:jobId/events',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Stream job progress via Server-Sent Events',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          jobId: z.string(),
        }),
      },
    },
    async (request, reply): Promise<void> => {
      const { jobId } = request.params;

      const job = await mtBatchQueue.getJob(jobId);
      if (!job) {
        throw new NotFoundError('Job');
      }

      // Verify user owns the job
      if (job.data.userId !== request.user.userId) {
        throw new ForbiddenError('Not authorized to view this job');
      }

      // Check if job is already finished
      const state = await job.getState();
      if (state === 'completed' || state === 'failed') {
        // Return final state immediately
        reply.header('Content-Type', 'application/json');
        const progress = job.progress as BulkTranslateProgress | undefined;
        reply.send({
          type: state,
          jobId: job.id!,
          result: job.returnvalue,
          progress: progress,
          failedReason: job.failedReason,
        });
        return;
      }

      // Set SSE headers (including CORS headers since we bypass Fastify's middleware)
      const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      });

      // Helper to send SSE event
      const sendEvent = (event: SSEEvent) => {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Send initial connected event with current progress
      const currentProgress = job.progress as BulkTranslateProgress | undefined;
      sendEvent({
        type: 'connected',
        jobId: job.id!,
        data: currentProgress || { total: 0, processed: 0, translated: 0, skipped: 0, failed: 0 },
      });

      // Set up event listeners
      // Cleanup function
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        mtBatchQueueEvents.removeAllListeners('progress');
        mtBatchQueueEvents.removeAllListeners('completed');
        mtBatchQueueEvents.removeAllListeners('failed');
        reply.raw.end();
      };

      // Subscribe to events using BullMQ's event signatures
      mtBatchQueueEvents.on('progress', (args) => {
        if (args.jobId === jobId) {
          sendEvent({
            type: 'progress',
            jobId: args.jobId,
            data: args.data as BulkTranslateProgress,
          });
        }
      });

      mtBatchQueueEvents.on('completed', (args) => {
        if (args.jobId === jobId) {
          sendEvent({
            type: 'completed',
            jobId: args.jobId,
            data: args.returnvalue,
          });
          cleanup();
        }
      });

      mtBatchQueueEvents.on('failed', (args) => {
        if (args.jobId === jobId) {
          sendEvent({
            type: 'failed',
            jobId: args.jobId,
            data: { error: args.failedReason },
          });
          cleanup();
        }
      });

      // Handle client disconnect
      request.raw.on('close', () => {
        cleanup();
      });

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        reply.raw.write(':heartbeat\n\n');
      }, 15000);

      request.raw.on('close', () => {
        clearInterval(heartbeat);
      });
    }
  );

  /**
   * POST /api/jobs/:jobId/cancel - Cancel a job
   */
  app.post(
    '/api/jobs/:jobId/cancel',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Cancel a running job',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          jobId: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { jobId } = request.params;

      const job = await mtBatchQueue.getJob(jobId);
      if (!job) {
        throw new NotFoundError('Job');
      }

      // Verify user owns the job
      if (job.data.userId !== request.user.userId) {
        throw new ForbiddenError('Not authorized to cancel this job');
      }

      const state = await job.getState();
      if (state === 'completed' || state === 'failed') {
        return {
          success: false,
          message: `Job is already ${state}`,
        };
      }

      // Remove the job (this will prevent it from being processed if waiting)
      // For active jobs, BullMQ doesn't support graceful cancellation,
      // but removing it will prevent further processing after current iteration
      await job.remove();

      return {
        success: true,
        message: 'Job cancelled',
      };
    }
  );
};

export default jobRoutes;
