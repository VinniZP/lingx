/**
 * Quality Estimation Routes
 *
 * Thin route handlers that delegate to CQRS handlers.
 * Rate limited to prevent AI API cost abuse.
 */
import rateLimit from '@fastify/rate-limit';
import {
  batchQualityBodySchema,
  batchQualityJobResponseSchema,
  branchIdParamsSchema,
  branchQualitySummaryResponseSchema,
  evaluateQualityBodySchema,
  icuValidationResultSchema,
  keyIdParamsSchema,
  keyQualityIssuesResponseSchema,
  projectIdParamsSchema,
  qualityScoreResponseSchema,
  qualityScoringConfigSchema,
  translationIdParamsSchema,
  updateQualityScoringConfigSchema,
  validateIcuBodySchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  EvaluateQualityCommand,
  GetBranchSummaryQuery,
  GetCachedScoreQuery,
  GetKeyIssuesQuery,
  GetQualityConfigQuery,
  QueueBatchEvaluationCommand,
  UpdateQualityConfigCommand,
  ValidateICUQuery,
} from '../modules/quality-estimation/index.js';

const qualityEstimationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Rate limit AI evaluation endpoints to prevent cost abuse
  // Single evaluations: 30/min per user (allows rapid key navigation)
  // Batch evaluations: 5/min per user (expensive AI calls)
  const isProduction = process.env.NODE_ENV === 'production';
  await fastify.register(rateLimit, {
    max: isProduction ? 30 : 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Rate limit by user ID, falling back to IP for unauthenticated requests
      return request.user?.userId || request.ip;
    },
    hook: 'preHandler',
    // Only apply to AI-triggering endpoints (evaluate single, batch)
    allowList: (request) => {
      // Skip rate limiting for read-only endpoints
      if (request.method === 'GET') return true;
      if (request.url.includes('/validate-icu')) return true;
      return false;
    },
  });

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
        params: translationIdParamsSchema,
        body: evaluateQualityBodySchema,
        response: {
          200: qualityScoreResponseSchema,
        },
      },
    },
    async (request) => {
      const { translationId } = request.params;
      const { forceAI } = request.body || {};

      return await fastify.commandBus.execute(
        new EvaluateQualityCommand(translationId, request.user!.userId, { forceAI })
      );
    }
  );

  /**
   * GET /api/translations/:translationId/quality - Get cached quality score
   */
  app.get(
    '/api/translations/:translationId/quality',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get cached quality score for a translation (does not trigger evaluation)',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: translationIdParamsSchema,
        response: {
          200: qualityScoreResponseSchema
            .omit({ needsAIEvaluation: true, cached: true })
            .nullable(),
        },
      },
    },
    async (request) => {
      const { translationId } = request.params;

      return await fastify.queryBus.execute(
        new GetCachedScoreQuery(translationId, request.user!.userId)
      );
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
        params: branchIdParamsSchema,
        body: batchQualityBodySchema,
        response: {
          200: batchQualityJobResponseSchema,
        },
      },
    },
    async (request) => {
      const { branchId } = request.params;
      const { translationIds, forceAI } = request.body || {};

      return await fastify.commandBus.execute(
        new QueueBatchEvaluationCommand(branchId, request.user!.userId, {
          translationIds,
          forceAI,
        })
      );
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
        params: branchIdParamsSchema,
        response: {
          200: branchQualitySummaryResponseSchema,
        },
      },
    },
    async (request) => {
      const { branchId } = request.params;

      return await fastify.queryBus.execute(
        new GetBranchSummaryQuery(branchId, request.user!.userId)
      );
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
        params: projectIdParamsSchema,
        response: {
          200: qualityScoringConfigSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      return await fastify.queryBus.execute(
        new GetQualityConfigQuery(projectId, request.user!.userId)
      );
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
        params: projectIdParamsSchema,
        body: updateQualityScoringConfigSchema,
        response: {
          200: qualityScoringConfigSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      return await fastify.commandBus.execute(
        new UpdateQualityConfigCommand(projectId, request.user!.userId, request.body)
      );
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
        body: validateIcuBodySchema,
        response: {
          200: icuValidationResultSchema,
        },
      },
    },
    async (request) => {
      const { text } = request.body;

      return await fastify.queryBus.execute(new ValidateICUQuery(text));
    }
  );

  /**
   * GET /api/keys/:keyId/quality/issues - Get quality issues for all translations of a key
   */
  app.get(
    '/api/keys/:keyId/quality/issues',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get quality issues for all translations of a key, grouped by language',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: keyIdParamsSchema,
        response: {
          200: keyQualityIssuesResponseSchema,
        },
      },
    },
    async (request) => {
      const { keyId } = request.params;

      return await fastify.queryBus.execute(new GetKeyIssuesQuery(keyId, request.user!.userId));
    }
  );
};

export default qualityEstimationRoutes;
