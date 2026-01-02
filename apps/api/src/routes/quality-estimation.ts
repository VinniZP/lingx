/**
 * Quality Estimation Routes
 *
 * Handles translation quality scoring operations
 * - Individual translation evaluation
 * - Batch quality scoring
 * - Branch quality summaries
 * - Project quality configuration
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { QualityEstimationService } from '../services/quality-estimation.service.js';
import { BranchService } from '../services/branch.service.js';
import { mtBatchQueue } from '../lib/queues.js';
import type { MTJobData } from '../workers/mt-batch.worker.js';
import { NotFoundError } from '../plugins/error-handler.js';

const qualityEstimationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const qualityService = new QualityEstimationService(fastify.prisma);
  const branchService = new BranchService(fastify.prisma);

  /**
   * POST /api/translations/:translationId/quality - Evaluate single translation
   */
  app.post(
    '/api/translations/:translationId/quality',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Evaluate quality score for a single translation',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          translationId: z.string(),
        }),
        body: z.object({
          forceAI: z.boolean().optional(),
        }),
        response: {
          200: z.object({
            score: z.number().min(0).max(100),
            accuracy: z.number().min(0).max(100).optional(),
            fluency: z.number().min(0).max(100).optional(),
            terminology: z.number().min(0).max(100).optional(),
            format: z.number().min(0).max(100).optional(),
            passed: z.boolean(),
            needsAIEvaluation: z.boolean(),
            issues: z.array(z.any()),
            evaluationType: z.enum(['heuristic', 'ai', 'hybrid']),
            cached: z.boolean(),
          }),
        },
      },
    },
    async (request) => {
      const { translationId } = request.params;
      const { forceAI } = request.body || {};

      return qualityService.evaluate(translationId, { forceAI });
    }
  );

  /**
   * POST /api/branches/:branchId/quality/batch - Queue batch evaluation job
   */
  app.post(
    '/api/branches/:branchId/quality/batch',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Queue batch quality evaluation for translations',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: z.object({
          translationIds: z.array(z.string()).optional(),
          forceAI: z.boolean().optional(),
        }),
        response: {
          200: z.object({
            jobId: z.string(),
          }),
        },
      },
    },
    async (request) => {
      const { branchId } = request.params;
      const { translationIds, forceAI } = request.body || {};

      // Get project ID from branch
      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      // If no translation IDs provided, get all translations in branch
      const ids =
        translationIds ||
        (
          await fastify.prisma.translation.findMany({
            where: { key: { branchId }, value: { not: '' } },
            select: { id: true },
          })
        ).map((t) => t.id);

      // Queue batch job
      const job = await mtBatchQueue.add('quality-batch', {
        type: 'quality-batch',
        projectId,
        userId: request.user!.userId,
        branchId,
        translationIds: ids,
        forceAI,
      } as MTJobData);

      return { jobId: job.id || '' };
    }
  );

  /**
   * GET /api/branches/:branchId/quality/summary - Get quality overview for branch
   */
  app.get(
    '/api/branches/:branchId/quality/summary',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get quality summary statistics for a branch',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        response: {
          200: z.object({
            averageScore: z.number(),
            distribution: z.object({
              excellent: z.number(),
              good: z.number(),
              needsReview: z.number(),
            }),
            byLanguage: z.record(z.string(), z.object({
              average: z.number(),
              count: z.number(),
            })),
            totalScored: z.number(),
            totalTranslations: z.number(),
          }),
        },
      },
    },
    async (request) => {
      const { branchId } = request.params;
      return qualityService.getBranchSummary(branchId);
    }
  );

  /**
   * GET /api/projects/:projectId/quality/config - Get quality scoring config
   */
  app.get(
    '/api/projects/:projectId/quality/config',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get quality scoring configuration for project',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: z.object({
            scoreAfterAITranslation: z.boolean(),
            scoreBeforeMerge: z.boolean(),
            autoApproveThreshold: z.number(),
            flagThreshold: z.number(),
            aiEvaluationEnabled: z.boolean(),
            aiEvaluationProvider: z.string().nullable(),
            aiEvaluationModel: z.string().nullable(),
          }),
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      return qualityService.getConfig(projectId);
    }
  );

  /**
   * PUT /api/projects/:projectId/quality/config - Update quality scoring config
   */
  app.put(
    '/api/projects/:projectId/quality/config',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update quality scoring configuration for project',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: z.object({
          scoreAfterAITranslation: z.boolean().optional(),
          scoreBeforeMerge: z.boolean().optional(),
          autoApproveThreshold: z.number().min(0).max(100).optional(),
          flagThreshold: z.number().min(0).max(100).optional(),
          aiEvaluationEnabled: z.boolean().optional(),
          aiEvaluationProvider: z.string().nullable().optional(),
          aiEvaluationModel: z.string().nullable().optional(),
        }),
        response: {
          200: z.object({
            scoreAfterAITranslation: z.boolean(),
            scoreBeforeMerge: z.boolean(),
            autoApproveThreshold: z.number(),
            flagThreshold: z.number(),
            aiEvaluationEnabled: z.boolean(),
            aiEvaluationProvider: z.string().nullable(),
            aiEvaluationModel: z.string().nullable(),
          }),
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      await qualityService.updateConfig(projectId, request.body);
      return qualityService.getConfig(projectId);
    }
  );

  /**
   * POST /api/quality/validate-icu - Validate ICU MessageFormat syntax
   */
  app.post(
    '/api/quality/validate-icu',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Validate ICU MessageFormat syntax',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        body: z.object({
          text: z.string(),
        }),
        response: {
          200: z.object({
            valid: z.boolean(),
            error: z.string().optional(),
          }),
        },
      },
    },
    async (request) => {
      const { text } = request.body;
      return qualityService.validateICUSyntax(text);
    }
  );
};

export default qualityEstimationRoutes;
