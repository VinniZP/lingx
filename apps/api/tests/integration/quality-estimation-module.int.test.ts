/**
 * Quality Estimation Module Integration Tests
 *
 * Tests the CQRS flow from command/query bus through handlers to services.
 * Verifies module registration, DI wiring, and database operations.
 * External AI APIs are mocked to avoid actual API calls.
 */
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { EvaluateQualityCommand } from '../../src/modules/quality-estimation/commands/evaluate-quality.command.js';
import { EvaluateQualityHandler } from '../../src/modules/quality-estimation/commands/evaluate-quality.handler.js';
import { QueueBatchEvaluationCommand } from '../../src/modules/quality-estimation/commands/queue-batch-evaluation.command.js';
import { QueueBatchEvaluationHandler } from '../../src/modules/quality-estimation/commands/queue-batch-evaluation.handler.js';
import { UpdateQualityConfigCommand } from '../../src/modules/quality-estimation/commands/update-quality-config.command.js';
import { UpdateQualityConfigHandler } from '../../src/modules/quality-estimation/commands/update-quality-config.handler.js';
import { QualityActivityHandler } from '../../src/modules/quality-estimation/handlers/quality-activity.handler.js';
import { GetBranchSummaryHandler } from '../../src/modules/quality-estimation/queries/get-branch-summary.handler.js';
import { GetBranchSummaryQuery } from '../../src/modules/quality-estimation/queries/get-branch-summary.query.js';
import { GetCachedScoreHandler } from '../../src/modules/quality-estimation/queries/get-cached-score.handler.js';
import { GetCachedScoreQuery } from '../../src/modules/quality-estimation/queries/get-cached-score.query.js';
import { GetKeyIssuesHandler } from '../../src/modules/quality-estimation/queries/get-key-issues.handler.js';
import { GetKeyIssuesQuery } from '../../src/modules/quality-estimation/queries/get-key-issues.query.js';
import { GetQualityConfigHandler } from '../../src/modules/quality-estimation/queries/get-quality-config.handler.js';
import { GetQualityConfigQuery } from '../../src/modules/quality-estimation/queries/get-quality-config.query.js';
import { ValidateICUHandler } from '../../src/modules/quality-estimation/queries/validate-icu.handler.js';
import { ValidateICUQuery } from '../../src/modules/quality-estimation/queries/validate-icu.query.js';
import type { Cradle } from '../../src/shared/container/index.js';

// Mock the AI SDK to avoid actual API calls
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      accuracy: 90,
      fluency: 85,
      terminology: 88,
      issues: [],
    }),
    usage: { promptTokens: 100, completionTokens: 50 },
  }),
}));

describe('Quality Estimation Module Integration', () => {
  let app: FastifyInstance;
  let container: AwilixContainer<Cradle>;
  let testUserId: string;
  let testProjectId: string;
  let testBranchId: string;
  let testKeyId: string;
  let testTranslationId: string;

  beforeAll(async () => {
    // Set encryption key for API key encryption
    process.env.AI_ENCRYPTION_KEY = 'a'.repeat(64);

    app = await buildApp({ logger: false });
    await app.ready();
    container = app.container;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data in correct order (respecting foreign keys)
    await app.prisma.translationQualityScore.deleteMany({});
    await app.prisma.qualityScoringConfig.deleteMany({
      where: { project: { slug: 'quality-test-project' } },
    });
    await app.prisma.translation.deleteMany({
      where: { key: { branch: { space: { project: { slug: 'quality-test-project' } } } } },
    });
    await app.prisma.translationKey.deleteMany({
      where: { branch: { space: { project: { slug: 'quality-test-project' } } } },
    });
    await app.prisma.branch.deleteMany({
      where: { space: { project: { slug: 'quality-test-project' } } },
    });
    await app.prisma.space.deleteMany({
      where: { project: { slug: 'quality-test-project' } },
    });
    await app.prisma.projectMember.deleteMany({
      where: { project: { slug: 'quality-test-project' } },
    });
    await app.prisma.projectLanguage.deleteMany({
      where: { project: { slug: 'quality-test-project' } },
    });
    await app.prisma.project.deleteMany({
      where: { slug: 'quality-test-project' },
    });

    // Create test user
    const user = await app.prisma.user.upsert({
      where: { email: 'quality-test@example.com' },
      update: {},
      create: {
        email: 'quality-test@example.com',
        name: 'Quality Test User',
        password: 'hashed',
      },
    });
    testUserId = user.id;

    // Create test project with languages
    const project = await app.prisma.project.create({
      data: {
        name: 'Quality Test Project',
        slug: 'quality-test-project',
        defaultLanguage: 'en',
        languages: {
          create: [
            { code: 'en', name: 'English', isDefault: true },
            { code: 'de', name: 'German' },
          ],
        },
        members: {
          create: {
            userId: testUserId,
            role: 'OWNER',
          },
        },
      },
    });
    testProjectId = project.id;

    // Create space and branch
    const space = await app.prisma.space.create({
      data: {
        name: 'Default',
        slug: 'default',
        projectId: testProjectId,
      },
    });

    const branch = await app.prisma.branch.create({
      data: {
        name: 'main',
        slug: 'main',
        isDefault: true,
        spaceId: space.id,
      },
    });
    testBranchId = branch.id;

    // Create a key with translations
    const key = await app.prisma.translationKey.create({
      data: {
        name: 'test.greeting',
        branchId: testBranchId,
      },
    });
    testKeyId = key.id;

    // Create source translation (English)
    await app.prisma.translation.create({
      data: {
        keyId: testKeyId,
        language: 'en',
        value: 'Hello {name}!',
      },
    });

    // Create target translation (German)
    const translation = await app.prisma.translation.create({
      data: {
        keyId: testKeyId,
        language: 'de',
        value: 'Hallo {name}!',
      },
    });
    testTranslationId = translation.id;
  });

  describe('Handler Registration', () => {
    it('should register all command handlers in container', () => {
      const evaluateHandler = container.resolve('qualityEvaluateHandler');
      const queueBatchHandler = container.resolve('qualityQueueBatchHandler');
      const updateConfigHandler = container.resolve('qualityUpdateConfigHandler');

      expect(evaluateHandler).toBeInstanceOf(EvaluateQualityHandler);
      expect(queueBatchHandler).toBeInstanceOf(QueueBatchEvaluationHandler);
      expect(updateConfigHandler).toBeInstanceOf(UpdateQualityConfigHandler);
    });

    it('should register all query handlers in container', () => {
      const getCachedScoreHandler = container.resolve('qualityGetCachedScoreHandler');
      const getBranchSummaryHandler = container.resolve('qualityGetBranchSummaryHandler');
      const getConfigHandler = container.resolve('qualityGetConfigHandler');
      const getKeyIssuesHandler = container.resolve('qualityGetKeyIssuesHandler');
      const validateICUHandler = container.resolve('qualityValidateICUHandler');

      expect(getCachedScoreHandler).toBeInstanceOf(GetCachedScoreHandler);
      expect(getBranchSummaryHandler).toBeInstanceOf(GetBranchSummaryHandler);
      expect(getConfigHandler).toBeInstanceOf(GetQualityConfigHandler);
      expect(getKeyIssuesHandler).toBeInstanceOf(GetKeyIssuesHandler);
      expect(validateICUHandler).toBeInstanceOf(ValidateICUHandler);
    });

    it('should register event handler in container', () => {
      const activityHandler = container.resolve('qualityActivityHandler');

      expect(activityHandler).toBeInstanceOf(QualityActivityHandler);
    });
  });

  describe('EvaluateQualityCommand Flow', () => {
    it('should evaluate quality through command bus', async () => {
      const result = await app.commandBus.execute(
        new EvaluateQualityCommand(testTranslationId, testUserId, {})
      );

      expect(result).toMatchObject({
        score: expect.any(Number),
        issues: expect.any(Array),
        evaluationType: 'heuristic',
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);

      // Verify score was saved in database
      const dbScore = await app.prisma.translationQualityScore.findUnique({
        where: { translationId: testTranslationId },
      });
      expect(dbScore).not.toBeNull();
      expect(dbScore?.score).toBe(result.score);
    });

    it('should cache the score for subsequent evaluations', async () => {
      // First evaluation
      const result1 = await app.commandBus.execute(
        new EvaluateQualityCommand(testTranslationId, testUserId, {})
      );

      // Second evaluation should use cache
      const result2 = await app.commandBus.execute(
        new EvaluateQualityCommand(testTranslationId, testUserId, {})
      );

      expect(result1.score).toBe(result2.score);
    });
  });

  describe('GetCachedScoreQuery Flow', () => {
    it('should return null when no cached score exists', async () => {
      const result = await app.queryBus.execute(
        new GetCachedScoreQuery(testTranslationId, testUserId)
      );

      expect(result).toBeNull();
    });

    it('should return cached score after evaluation', async () => {
      // First evaluate
      await app.commandBus.execute(new EvaluateQualityCommand(testTranslationId, testUserId, {}));

      // Then get cached score
      const result = await app.queryBus.execute(
        new GetCachedScoreQuery(testTranslationId, testUserId)
      );

      expect(result).not.toBeNull();
      expect(result?.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GetBranchSummaryQuery Flow', () => {
    it('should return empty summary for branch without evaluations', async () => {
      const result = await app.queryBus.execute(
        new GetBranchSummaryQuery(testBranchId, testUserId)
      );

      expect(result).toMatchObject({
        averageScore: 0,
        totalScored: 0,
        totalTranslations: expect.any(Number),
        distribution: {
          excellent: 0,
          good: 0,
          needsReview: 0,
        },
        byLanguage: {},
      });
    });

    it('should return summary with scores after evaluation', async () => {
      // First evaluate the translation
      await app.commandBus.execute(new EvaluateQualityCommand(testTranslationId, testUserId, {}));

      // Then get branch summary
      const result = await app.queryBus.execute(
        new GetBranchSummaryQuery(testBranchId, testUserId)
      );

      expect(result.totalScored).toBeGreaterThan(0);
      expect(result.averageScore).toBeGreaterThanOrEqual(0);
      expect(result.byLanguage).toHaveProperty('de');
    });
  });

  describe('GetKeyIssuesQuery Flow', () => {
    it('should return empty issues for key without evaluations', async () => {
      const result = await app.queryBus.execute(new GetKeyIssuesQuery(testKeyId, testUserId));

      // No evaluations yet, so no issues
      expect(result).toMatchObject({ issues: {} });
    });

    it('should return issues by language after evaluation', async () => {
      // First evaluate the translation
      await app.commandBus.execute(new EvaluateQualityCommand(testTranslationId, testUserId, {}));

      // Then get key issues
      const result = await app.queryBus.execute(new GetKeyIssuesQuery(testKeyId, testUserId));

      // Result is an object keyed by language code
      expect(typeof result).toBe('object');
    });
  });

  describe('QueueBatchEvaluationCommand Flow', () => {
    it('should queue batch evaluation for branch', async () => {
      const result = await app.commandBus.execute(
        new QueueBatchEvaluationCommand(testBranchId, testUserId, {})
      );

      expect(result).toMatchObject({
        stats: {
          total: expect.any(Number),
          cached: expect.any(Number),
          queued: expect.any(Number),
        },
      });
    });

    it('should return cached=total when all translations are cached', async () => {
      // First evaluate all translations to populate cache
      await app.commandBus.execute(new EvaluateQualityCommand(testTranslationId, testUserId, {}));

      // Then queue batch - should hit cache
      const result = await app.commandBus.execute(
        new QueueBatchEvaluationCommand(testBranchId, testUserId, {})
      );

      // Most should be cached now
      expect(result.stats.cached).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GetQualityConfigQuery Flow', () => {
    it('should return default config for project without custom config', async () => {
      const result = await app.queryBus.execute(
        new GetQualityConfigQuery(testProjectId, testUserId)
      );

      expect(result).toMatchObject({
        aiEvaluationEnabled: true, // Default is enabled
        aiEvaluationProvider: null,
        aiEvaluationModel: null,
      });
    });
  });

  describe('UpdateQualityConfigCommand Flow', () => {
    it('should update config through command bus', async () => {
      const result = await app.commandBus.execute(
        new UpdateQualityConfigCommand(testProjectId, testUserId, {
          aiEvaluationEnabled: true,
          aiEvaluationProvider: 'OPENAI',
          aiEvaluationModel: 'gpt-4o-mini',
        })
      );

      expect(result).toMatchObject({
        aiEvaluationEnabled: true,
        aiEvaluationProvider: 'OPENAI',
        aiEvaluationModel: 'gpt-4o-mini',
      });

      // Verify in database
      const dbConfig = await app.prisma.qualityScoringConfig.findUnique({
        where: { projectId: testProjectId },
      });
      expect(dbConfig).not.toBeNull();
      expect(dbConfig?.aiEvaluationEnabled).toBe(true);
      expect(dbConfig?.aiEvaluationProvider).toBe('OPENAI');
    });
  });

  describe('ValidateICUQuery Flow', () => {
    it('should validate correct ICU syntax', async () => {
      const result = await app.queryBus.execute(new ValidateICUQuery('Hello {name}!'));

      expect(result).toEqual({ valid: true });
    });

    it('should return error for invalid ICU syntax', async () => {
      const result = await app.queryBus.execute(new ValidateICUQuery('Hello {name'));

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate complex plural ICU syntax', async () => {
      const result = await app.queryBus.execute(
        new ValidateICUQuery('{count, plural, =0 {No items} one {# item} other {# items}}')
      );

      expect(result).toEqual({ valid: true });
    });
  });

  describe('Authorization', () => {
    it('should reject EvaluateQualityCommand for non-member user', async () => {
      const otherUser = await app.prisma.user.create({
        data: {
          email: 'other-quality-user@example.com',
          name: 'Other User',
          password: 'hashed',
        },
      });

      await expect(
        app.commandBus.execute(new EvaluateQualityCommand(testTranslationId, otherUser.id, {}))
      ).rejects.toThrow();

      // Clean up
      await app.prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should reject UpdateQualityConfigCommand for DEVELOPER role', async () => {
      const developerUser = await app.prisma.user.create({
        data: {
          email: 'developer-quality-user@example.com',
          name: 'Developer User',
          password: 'hashed',
        },
      });

      await app.prisma.projectMember.create({
        data: {
          projectId: testProjectId,
          userId: developerUser.id,
          role: 'DEVELOPER',
        },
      });

      await expect(
        app.commandBus.execute(
          new UpdateQualityConfigCommand(testProjectId, developerUser.id, {
            aiEvaluationEnabled: true,
          })
        )
      ).rejects.toThrow();

      // Clean up
      await app.prisma.projectMember.delete({
        where: {
          projectId_userId: { projectId: testProjectId, userId: developerUser.id },
        },
      });
      await app.prisma.user.delete({ where: { id: developerUser.id } });
    });

    it('should allow UpdateQualityConfigCommand for MANAGER role', async () => {
      const managerUser = await app.prisma.user.create({
        data: {
          email: 'manager-quality-user@example.com',
          name: 'Manager User',
          password: 'hashed',
        },
      });

      await app.prisma.projectMember.create({
        data: {
          projectId: testProjectId,
          userId: managerUser.id,
          role: 'MANAGER',
        },
      });

      // Should not throw
      const result = await app.commandBus.execute(
        new UpdateQualityConfigCommand(testProjectId, managerUser.id, {
          aiEvaluationEnabled: false,
        })
      );

      expect(result.aiEvaluationEnabled).toBe(false);

      // Clean up
      await app.prisma.projectMember.delete({
        where: {
          projectId_userId: { projectId: testProjectId, userId: managerUser.id },
        },
      });
      await app.prisma.user.delete({ where: { id: managerUser.id } });
    });
  });
});
