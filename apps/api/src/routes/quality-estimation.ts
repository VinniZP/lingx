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
import { mtBatchQueue } from '../lib/queues.js';
import type { MTJobData } from '../workers/mt-batch.worker.js';
import { NotFoundError, ForbiddenError } from '../plugins/error-handler.js';

/**
 * Maximum number of translation IDs that can be submitted in a single batch request
 * to prevent DoS attacks via extremely large payloads.
 */
const MAX_BATCH_TRANSLATION_IDS = 1000;

/**
 * Zod schema for QualityIssueSeverity
 */
const qualityIssueSeveritySchema = z.enum(['error', 'warning', 'info']);

/**
 * Zod schema for QualityCheckType (all possible issue types)
 */
const qualityCheckTypeSchema = z.enum([
  // Heuristic checks
  'placeholder_missing',
  'placeholder_extra',
  'whitespace_leading',
  'whitespace_trailing',
  'whitespace_double',
  'whitespace_tab',
  'punctuation_mismatch',
  'length_too_long',
  'length_critical',
  'length_extreme',
  'icu_syntax',
  'glossary_missing',
  // AI evaluation issues
  'ai_accuracy',
  'ai_fluency',
  'ai_terminology',
]);

/**
 * Zod schema for QualityIssue - represents a single quality issue found in a translation
 */
const qualityIssueSchema = z.object({
  /** Type of the issue */
  type: qualityCheckTypeSchema,
  /** Severity level */
  severity: qualityIssueSeveritySchema,
  /** Human-readable message */
  message: z.string(),
  /** Position in target string where issue occurs (if applicable) */
  position: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional(),
  /** Additional context data */
  context: z
    .object({
      expected: z.string().optional(),
      found: z.string().optional(),
      placeholder: z.string().optional(),
      ratio: z.string().optional(),
    })
    .optional(),
});

const qualityEstimationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const qualityService = new QualityEstimationService(fastify.prisma);

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
            issues: z.array(qualityIssueSchema),
            evaluationType: z.enum(['heuristic', 'ai', 'hybrid']),
            cached: z.boolean(),
          }),
        },
      },
    },
    async (request) => {
      const { translationId } = request.params;
      const { forceAI } = request.body || {};

      // Verify user has access to this translation's project
      const translation = await fastify.prisma.translation.findUnique({
        where: { id: translationId },
        select: {
          key: {
            select: {
              branch: {
                select: {
                  space: {
                    select: {
                      project: {
                        select: {
                          members: {
                            where: { userId: request.user!.userId },
                            select: { userId: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!translation) {
        throw new NotFoundError('Translation');
      }
      if (translation.key.branch.space.project.members.length === 0) {
        throw new ForbiddenError('Not authorized to evaluate this translation');
      }

      return qualityService.evaluate(translationId, { forceAI });
    }
  );

  /**
   * GET /api/translations/:translationId/quality - Get cached quality score (no evaluation)
   */
  app.get(
    '/api/translations/:translationId/quality',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get cached quality score for a translation (does not trigger evaluation)',
        tags: ['Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          translationId: z.string(),
        }),
        response: {
          200: z
            .object({
              score: z.number().min(0).max(100),
              accuracy: z.number().min(0).max(100).optional(),
              fluency: z.number().min(0).max(100).optional(),
              terminology: z.number().min(0).max(100).optional(),
              format: z.number().min(0).max(100).optional(),
              passed: z.boolean(),
              issues: z.array(qualityIssueSchema),
              evaluationType: z.enum(['heuristic', 'ai', 'hybrid']),
            })
            .nullable(),
        },
      },
    },
    async (request) => {
      const { translationId } = request.params;

      // Verify user has access to this translation's project
      const translation = await fastify.prisma.translation.findUnique({
        where: { id: translationId },
        select: {
          qualityScore: true,
          key: {
            select: {
              branch: {
                select: {
                  space: {
                    select: {
                      project: {
                        select: {
                          members: {
                            where: { userId: request.user!.userId },
                            select: { userId: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!translation) {
        return null;
      }
      if (translation.key.branch.space.project.members.length === 0) {
        throw new ForbiddenError('Not authorized to view this translation');
      }

      if (!translation.qualityScore) {
        return null;
      }

      const cached = translation.qualityScore;
      return {
        score: cached.score,
        accuracy: cached.accuracyScore ?? undefined,
        fluency: cached.fluencyScore ?? undefined,
        terminology: cached.terminologyScore ?? undefined,
        format: cached.formatScore,
        passed: cached.score >= 80,
        issues: cached.issues as z.infer<typeof qualityIssueSchema>[],
        evaluationType: cached.evaluationType as 'heuristic' | 'ai' | 'hybrid',
      };
    }
  );

  /**
   * POST /api/branches/:branchId/quality/batch - Queue batch evaluation job
   *
   * Optimized: Pre-filters cache hits to avoid unnecessary evaluations
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
          translationIds: z.array(z.string()).max(MAX_BATCH_TRANSLATION_IDS).optional(),
          forceAI: z.boolean().optional(),
        }),
        response: {
          200: z.object({
            jobId: z.string(),
            stats: z.object({
              total: z.number(),
              cached: z.number(),
              queued: z.number(),
            }),
          }),
        },
      },
    },
    async (request) => {
      const { branchId } = request.params;
      const { translationIds, forceAI } = request.body || {};

      // Defense-in-depth: runtime validation before database query
      // (Zod already validates at schema level, but we double-check here)
      if (translationIds && translationIds.length > MAX_BATCH_TRANSLATION_IDS) {
        throw new ForbiddenError(
          `Batch size exceeds maximum allowed (${MAX_BATCH_TRANSLATION_IDS}). ` +
          `Received: ${translationIds.length}`
        );
      }

      // Get project ID and enabled languages from branch, include membership check
      const branch = await fastify.prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          space: {
            select: {
              project: {
                select: {
                  id: true,
                  defaultLanguage: true,
                  languages: { select: { code: true } },
                  members: {
                    where: { userId: request.user!.userId },
                    select: { userId: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!branch) {
        throw new NotFoundError('Branch');
      }

      // Verify user has access to this project
      if (branch.space.project.members.length === 0) {
        throw new ForbiddenError('Not authorized to evaluate translations in this project');
      }

      const projectId = branch.space.project.id;
      const sourceLanguage = branch.space.project.defaultLanguage;
      const enabledLanguages = branch.space.project.languages.map((l) => l.code);

      // Get all translations with their quality scores
      const translations = await fastify.prisma.translation.findMany({
        where: translationIds
          ? { id: { in: translationIds } }
          : {
              key: { branchId },
              value: { not: '' },
              language: { in: enabledLanguages },
            },
        select: {
          id: true,
          keyId: true,
          language: true,
          value: true,
          qualityScore: {
            select: { contentHash: true },
          },
        },
      });

      // Get source translations for hash comparison (cache is ALWAYS checked)
      const keyIds = [...new Set(translations.map((t) => t.keyId))];
      const sourceTranslations = await fastify.prisma.translation.findMany({
        where: {
          keyId: { in: keyIds },
          language: sourceLanguage,
        },
        select: { keyId: true, value: true },
      });
      const sourceMap = new Map(sourceTranslations.map((s) => [s.keyId, s.value]));

      // Separate cache hits from misses
      // NOTE: This cache check is performed outside a transaction for performance.
      // Race condition mitigation:
      // - If translation changes after this check but before worker processes it,
      //   the worker will re-fetch current content and evaluate correctly.
      // - Worst case: we skip a translation that becomes stale, but it will be
      //   caught on the next batch evaluation.
      // - The contentHash-based caching ensures correctness: if content changed,
      //   the worker will detect it and re-evaluate.
      const needsEvaluation: string[] = [];
      let cacheHits = 0;

      for (const t of translations) {
        const sourceValue = sourceMap.get(t.keyId);
        if (!sourceValue) {
          // No source - needs format-only evaluation
          needsEvaluation.push(t.id);
          continue;
        }

        if (!t.qualityScore?.contentHash) {
          // No cached score
          needsEvaluation.push(t.id);
          continue;
        }

        // Check content hash
        const currentHash = qualityService.generateContentHash(sourceValue, t.value);
        if (t.qualityScore.contentHash !== currentHash) {
          // Content changed
          needsEvaluation.push(t.id);
        } else {
          // Cache hit!
          cacheHits++;
        }
      }

      console.log(
        `[Quality Batch] Pre-filter: ${translations.length} total, ${cacheHits} cached, ${needsEvaluation.length} need evaluation`
      );

      // If nothing needs evaluation, return early
      if (needsEvaluation.length === 0) {
        return {
          jobId: '',
          stats: { total: translations.length, cached: cacheHits, queued: 0 },
        };
      }

      // Queue only translations that need evaluation
      const job = await mtBatchQueue.add('quality-batch', {
        type: 'quality-batch',
        projectId,
        userId: request.user!.userId,
        branchId,
        translationIds: needsEvaluation,
        forceAI: forceAI ?? false, // Pass through to worker (affects AI vs heuristic choice, not cache)
      } as MTJobData);

      return {
        jobId: job.id || '',
        stats: { total: translations.length, cached: cacheHits, queued: needsEvaluation.length },
      };
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

      // Verify user has access to this branch's project
      const branch = await fastify.prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          space: {
            select: {
              project: {
                select: {
                  members: {
                    where: { userId: request.user!.userId },
                    select: { userId: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!branch) {
        throw new NotFoundError('Branch');
      }
      if (branch.space.project.members.length === 0) {
        throw new ForbiddenError('Not authorized to view this branch');
      }

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

      // Verify user has access to this project
      const membership = await fastify.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: request.user!.userId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenError('Not authorized to view this project');
      }

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

      // Verify user has access to this project (admin/maintainer for updates)
      const membership = await fastify.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: request.user!.userId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenError('Not authorized to modify this project');
      }
      // Only OWNER, ADMIN, or MAINTAINER can update config
      if (!['OWNER', 'ADMIN', 'MAINTAINER'].includes(membership.role)) {
        throw new ForbiddenError('Insufficient permissions to update project configuration');
      }

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
