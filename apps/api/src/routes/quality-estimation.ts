/**
 * Quality Estimation Routes
 *
 * Thin route handlers that delegate to services.
 */
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
import { mtBatchQueue } from '../lib/queues.js';
import { createAccessService } from '../services/access.service.js';
import {
  createBatchEvaluationService,
  createQualityEstimationService,
} from '../services/quality/index.js';

const qualityEstimationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const qualityService = createQualityEstimationService(fastify.prisma);
  const batchService = createBatchEvaluationService(fastify.prisma, mtBatchQueue);
  const accessService = createAccessService(fastify.prisma);

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

      await accessService.verifyTranslationAccess(request.user!.userId, translationId);
      return qualityService.evaluate(translationId, { forceAI });
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

      await accessService.verifyTranslationAccess(request.user!.userId, translationId);
      return qualityService.getCachedScore(translationId);
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

      const projectInfo = await accessService.verifyBranchAccess(request.user!.userId, branchId);

      return batchService.evaluateBranch(branchId, request.user!.userId, projectInfo, {
        translationIds,
        forceAI,
      });
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

      await accessService.verifyBranchAccess(request.user!.userId, branchId);
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
        params: projectIdParamsSchema,
        response: {
          200: qualityScoringConfigSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      await accessService.verifyProjectAccess(request.user!.userId, projectId);
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
        params: projectIdParamsSchema,
        body: updateQualityScoringConfigSchema,
        response: {
          200: qualityScoringConfigSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      await accessService.verifyProjectAccess(request.user!.userId, projectId, [
        'OWNER',
        'MANAGER',
      ]);

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
        body: validateIcuBodySchema,
        response: {
          200: icuValidationResultSchema,
        },
      },
    },
    async (request) => {
      const { text } = request.body;
      return qualityService.validateICUSyntax(text);
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

      await accessService.verifyKeyAccess(request.user!.userId, keyId);
      const issues = await qualityService.getKeyQualityIssues(keyId);
      return { issues };
    }
  );
};

export default qualityEstimationRoutes;
