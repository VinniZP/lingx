/**
 * Key Context Routes
 *
 * Provides endpoints for near-key context detection and management.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  bulkKeyContextSchema,
  bulkContextUpdateResponseSchema,
  relatedKeysQuerySchema,
  relatedKeysResponseSchema,
  aiContextQuerySchema,
  aiContextResponseSchema,
  analyzeRelationshipsSchema,
  analyzeRelationshipsResponseSchema,
} from '@lingx/shared';
import { KeyContextService } from '../services/key-context.service.js';
import { BranchService } from '../services/branch.service.js';
import { ProjectService } from '../services/project.service.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const keyContextRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const keyContextService = new KeyContextService(fastify.prisma);
  const branchService = new BranchService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);

  /**
   * PUT /api/branches/:branchId/keys/context - Bulk update key context
   */
  app.put(
    '/api/branches/:branchId/keys/context',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Bulk update key source context metadata from CLI extraction',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: bulkKeyContextSchema,
        response: {
          200: bulkContextUpdateResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;
      const { keys } = request.body;

      // Verify branch access
      const branch = await branchService.findById(branchId);
      if (!branch) {
        throw new NotFoundError('Branch');
      }

      const hasAccess = await projectService.checkMembership(
        branch.space.projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Map keys to ensure namespace is null instead of undefined
      const mappedKeys = keys.map((k) => ({
        ...k,
        namespace: k.namespace ?? null,
      }));

      const result = await keyContextService.updateKeyContext(branchId, mappedKeys);
      return result;
    }
  );

  /**
   * GET /api/branches/:branchId/keys/:keyId/related - Get related keys
   */
  app.get(
    '/api/branches/:branchId/keys/:keyId/related',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get related translation keys for context',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
          keyId: z.string(),
        }),
        querystring: relatedKeysQuerySchema,
        response: {
          200: relatedKeysResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId, keyId } = request.params;
      const { types, limit, includeTranslations } = request.query;

      // Verify branch access
      const branch = await branchService.findById(branchId);
      if (!branch) {
        throw new NotFoundError('Branch');
      }

      const hasAccess = await projectService.checkMembership(
        branch.space.projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Get key info
      const key = await fastify.prisma.translationKey.findUnique({
        where: { id: keyId },
        select: { id: true, name: true, namespace: true, branchId: true },
      });

      if (!key || key.branchId !== branchId) {
        throw new NotFoundError('Key');
      }

      // Parse types from comma-separated string
      const typeList = types
        ? (types.split(',') as Array<'SAME_FILE' | 'SAME_COMPONENT' | 'SEMANTIC'>)
        : undefined;

      const relationships = await keyContextService.getRelatedKeys(keyId, {
        types: typeList,
        limit,
        includeTranslations,
      });

      return {
        key: {
          id: key.id,
          name: key.name,
          namespace: key.namespace,
        },
        relationships,
      };
    }
  );

  /**
   * GET /api/branches/:branchId/keys/:keyId/ai-context - Get AI context
   */
  app.get(
    '/api/branches/:branchId/keys/:keyId/ai-context',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get AI context for translation assistance',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
          keyId: z.string(),
        }),
        querystring: aiContextQuerySchema,
        response: {
          200: aiContextResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId, keyId } = request.params;
      const { targetLanguage } = request.query;

      // Verify branch access
      const branch = await branchService.findById(branchId);
      if (!branch) {
        throw new NotFoundError('Branch');
      }

      const hasAccess = await projectService.checkMembership(
        branch.space.projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Get source language from project
      const project = await fastify.prisma.project.findUnique({
        where: { id: branch.space.projectId },
        select: { defaultLanguage: true },
      });

      const sourceLanguage = project?.defaultLanguage ?? 'en';

      const context = await keyContextService.getAIContext(
        keyId,
        targetLanguage,
        sourceLanguage
      );

      return context;
    }
  );

  /**
   * POST /api/branches/:branchId/keys/analyze-relationships - Trigger analysis
   */
  app.post(
    '/api/branches/:branchId/keys/analyze-relationships',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Trigger relationship analysis (background job)',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: analyzeRelationshipsSchema,
        response: {
          202: analyzeRelationshipsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { branchId } = request.params;
      const { types, minSimilarity } = request.body;

      // Verify branch access
      const branch = await branchService.findById(branchId);
      if (!branch) {
        throw new NotFoundError('Branch');
      }

      const hasAccess = await projectService.checkMembership(
        branch.space.projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Get source language
      const project = await fastify.prisma.project.findUnique({
        where: { id: branch.space.projectId },
        select: { defaultLanguage: true },
      });

      const sourceLanguage = project?.defaultLanguage ?? 'en';

      // Run analysis inline for now (could be a background job)
      const analyzeTypes = types ?? ['SEMANTIC'];

      if (analyzeTypes.includes('SEMANTIC')) {
        await keyContextService.computeSemanticRelationships(
          branchId,
          sourceLanguage,
          minSimilarity ?? 0.7
        );
      }

      // Generate a simple job ID
      const jobId = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      return reply.status(202).send({
        jobId,
        status: 'completed' as const,
      });
    }
  );

  /**
   * GET /api/branches/:branchId/keys/context/stats - Get context stats
   */
  app.get(
    '/api/branches/:branchId/keys/context/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get key context and relationship statistics',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        response: {
          200: z.object({
            sameFile: z.number(),
            sameComponent: z.number(),
            semantic: z.number(),
            keysWithSource: z.number(),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;

      // Verify branch access
      const branch = await branchService.findById(branchId);
      if (!branch) {
        throw new NotFoundError('Branch');
      }

      const hasAccess = await projectService.checkMembership(
        branch.space.projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      return keyContextService.getRelationshipStats(branchId);
    }
  );
};

export default keyContextRoutes;
