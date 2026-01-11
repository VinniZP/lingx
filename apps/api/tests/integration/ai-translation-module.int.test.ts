/**
 * AI Translation Module Integration Tests
 *
 * Tests the CQRS flow from command/query bus through handlers to repository.
 * Verifies module registration, DI wiring, and database operations.
 * External AI APIs are mocked to avoid actual API calls.
 */
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { DeleteConfigCommand } from '../../src/modules/ai-translation/commands/delete-config.command.js';
import { DeleteConfigHandler } from '../../src/modules/ai-translation/commands/delete-config.handler.js';
import { SaveConfigCommand } from '../../src/modules/ai-translation/commands/save-config.command.js';
import { SaveConfigHandler } from '../../src/modules/ai-translation/commands/save-config.handler.js';
import { TestConnectionHandler } from '../../src/modules/ai-translation/commands/test-connection.handler.js';
import { UpdateContextConfigCommand } from '../../src/modules/ai-translation/commands/update-context-config.command.js';
import { UpdateContextConfigHandler } from '../../src/modules/ai-translation/commands/update-context-config.handler.js';
import { AIActivityHandler } from '../../src/modules/ai-translation/handlers/ai-activity.handler.js';
import { GetConfigsHandler } from '../../src/modules/ai-translation/queries/get-configs.handler.js';
import { GetConfigsQuery } from '../../src/modules/ai-translation/queries/get-configs.query.js';
import { GetContextConfigHandler } from '../../src/modules/ai-translation/queries/get-context-config.handler.js';
import { GetContextConfigQuery } from '../../src/modules/ai-translation/queries/get-context-config.query.js';
import { GetSupportedModelsHandler } from '../../src/modules/ai-translation/queries/get-supported-models.handler.js';
import { GetSupportedModelsQuery } from '../../src/modules/ai-translation/queries/get-supported-models.query.js';
import { GetUsageHandler } from '../../src/modules/ai-translation/queries/get-usage.handler.js';
import { GetUsageQuery } from '../../src/modules/ai-translation/queries/get-usage.query.js';
import { TranslateHandler } from '../../src/modules/ai-translation/queries/translate.handler.js';
import { AITranslationRepository } from '../../src/modules/ai-translation/repositories/ai-translation.repository.js';
import { AIProviderService } from '../../src/modules/ai-translation/services/ai-provider.service.js';
import type { Cradle } from '../../src/shared/container/index.js';

// Mock the AI SDK to avoid actual API calls
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Mocked translation result',
    usage: { promptTokens: 10, completionTokens: 5 },
  }),
}));

describe('AI Translation Module Integration', () => {
  let app: FastifyInstance;
  let container: AwilixContainer<Cradle>;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    container = app.container;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data - use correct Prisma model names
    await app.prisma.aITranslationConfig.deleteMany({});
    await app.prisma.aIContextConfig.deleteMany({});
    await app.prisma.aITranslationUsage.deleteMany({});
    await app.prisma.aITranslationCache.deleteMany({});
    await app.prisma.projectMember.deleteMany({
      where: { project: { slug: 'ai-test-project' } },
    });
    await app.prisma.projectLanguage.deleteMany({
      where: { project: { slug: 'ai-test-project' } },
    });
    await app.prisma.project.deleteMany({
      where: { slug: 'ai-test-project' },
    });

    // Create test user and project
    const user = await app.prisma.user.upsert({
      where: { email: 'ai-test@example.com' },
      update: {},
      create: {
        email: 'ai-test@example.com',
        name: 'AI Test User',
        password: 'hashed',
      },
    });
    testUserId = user.id;

    const project = await app.prisma.project.upsert({
      where: { id: 'ai-test-project' },
      update: {},
      create: {
        id: 'ai-test-project',
        name: 'AI Test Project',
        slug: 'ai-test-project',
        defaultLanguage: 'en',
        languages: {
          create: [
            { code: 'en', name: 'English', isDefault: true },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
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
  });

  describe('Handler Registration', () => {
    it('should register all command handlers in container', () => {
      const saveConfigHandler = container.resolve('aiSaveConfigHandler');
      const deleteConfigHandler = container.resolve('aiDeleteConfigHandler');
      const updateContextConfigHandler = container.resolve('aiUpdateContextConfigHandler');
      const testConnectionHandler = container.resolve('aiTestConnectionHandler');

      expect(saveConfigHandler).toBeInstanceOf(SaveConfigHandler);
      expect(deleteConfigHandler).toBeInstanceOf(DeleteConfigHandler);
      expect(updateContextConfigHandler).toBeInstanceOf(UpdateContextConfigHandler);
      expect(testConnectionHandler).toBeInstanceOf(TestConnectionHandler);
    });

    it('should register all query handlers in container', () => {
      const getConfigsHandler = container.resolve('aiGetConfigsHandler');
      const getContextConfigHandler = container.resolve('aiGetContextConfigHandler');
      const getSupportedModelsHandler = container.resolve('aiGetSupportedModelsHandler');
      const getUsageHandler = container.resolve('aiGetUsageHandler');
      const translateHandler = container.resolve('aiTranslateHandler');

      expect(getConfigsHandler).toBeInstanceOf(GetConfigsHandler);
      expect(getContextConfigHandler).toBeInstanceOf(GetContextConfigHandler);
      expect(getSupportedModelsHandler).toBeInstanceOf(GetSupportedModelsHandler);
      expect(getUsageHandler).toBeInstanceOf(GetUsageHandler);
      expect(translateHandler).toBeInstanceOf(TranslateHandler);
    });

    it('should register event handler in container', () => {
      const aiActivityHandler = container.resolve('aiActivityHandler');

      expect(aiActivityHandler).toBeInstanceOf(AIActivityHandler);
    });

    it('should register repository in container', () => {
      const aiRepository = container.resolve('aiRepository');

      expect(aiRepository).toBeInstanceOf(AITranslationRepository);
    });

    it('should register provider service in container', () => {
      const aiProviderService = container.resolve('aiProviderService');

      expect(aiProviderService).toBeInstanceOf(AIProviderService);
    });
  });

  describe('SaveConfigCommand Flow', () => {
    it('should save AI config through command bus', async () => {
      const result = await app.commandBus.execute(
        new SaveConfigCommand(testProjectId, testUserId, {
          provider: 'OPENAI',
          apiKey: 'test-api-key-12345',
          model: 'gpt-5-mini',
          isActive: true,
          priority: 1,
        })
      );

      expect(result).toMatchObject({
        provider: 'OPENAI',
        model: 'gpt-5-mini',
        isActive: true,
        priority: 1,
      });
      expect(result.id).toBeDefined();

      // Verify in database
      const dbConfig = await app.prisma.aITranslationConfig.findFirst({
        where: { projectId: testProjectId, provider: 'OPENAI' },
      });
      expect(dbConfig).not.toBeNull();
      expect(dbConfig?.model).toBe('gpt-5-mini');
    });

    it('should update existing config when saving same provider', async () => {
      // First save
      await app.commandBus.execute(
        new SaveConfigCommand(testProjectId, testUserId, {
          provider: 'OPENAI',
          apiKey: 'test-api-key',
          model: 'gpt-5-mini',
          isActive: true,
          priority: 1,
        })
      );

      // Update with new model
      const result = await app.commandBus.execute(
        new SaveConfigCommand(testProjectId, testUserId, {
          provider: 'OPENAI',
          apiKey: 'test-api-key',
          model: 'gpt-5.1',
          isActive: true,
          priority: 2,
        })
      );

      expect(result.model).toBe('gpt-5.1');
      expect(result.priority).toBe(2);

      // Should only have one config for OPENAI
      const configs = await app.prisma.aITranslationConfig.findMany({
        where: { projectId: testProjectId, provider: 'OPENAI' },
      });
      expect(configs).toHaveLength(1);
    });
  });

  describe('GetConfigsQuery Flow', () => {
    it('should return empty configs for project with no configs', async () => {
      const result = await app.queryBus.execute(new GetConfigsQuery(testProjectId, testUserId));

      expect(result.configs).toEqual([]);
    });

    it('should return saved configs', async () => {
      // Save a config first
      await app.commandBus.execute(
        new SaveConfigCommand(testProjectId, testUserId, {
          provider: 'ANTHROPIC',
          apiKey: 'test-anthropic-key',
          model: 'claude-sonnet-4-5',
          isActive: true,
          priority: 1,
        })
      );

      const result = await app.queryBus.execute(new GetConfigsQuery(testProjectId, testUserId));

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0]).toMatchObject({
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4-5',
        isActive: true,
      });
    });
  });

  describe('DeleteConfigCommand Flow', () => {
    it('should delete config through command bus', async () => {
      // First save a config
      await app.commandBus.execute(
        new SaveConfigCommand(testProjectId, testUserId, {
          provider: 'OPENAI',
          apiKey: 'test-api-key',
          model: 'gpt-5-mini',
          isActive: true,
          priority: 1,
        })
      );

      // Then delete it
      const result = await app.commandBus.execute(
        new DeleteConfigCommand(testProjectId, testUserId, 'OPENAI')
      );

      expect(result.success).toBe(true);

      // Verify deleted from database
      const dbConfig = await app.prisma.aITranslationConfig.findFirst({
        where: { projectId: testProjectId, provider: 'OPENAI' },
      });
      expect(dbConfig).toBeNull();
    });
  });

  describe('GetContextConfigQuery Flow', () => {
    it('should return default context config', async () => {
      const result = await app.queryBus.execute(
        new GetContextConfigQuery(testProjectId, testUserId)
      );

      expect(result).toMatchObject({
        includeGlossary: true,
        includeTM: true,
        includeRelatedKeys: true,
        includeDescription: true,
        customInstructions: null,
      });
    });
  });

  describe('UpdateContextConfigCommand Flow', () => {
    it('should update context config', async () => {
      const result = await app.commandBus.execute(
        new UpdateContextConfigCommand(testProjectId, testUserId, {
          includeGlossary: false,
          customInstructions: 'Use formal tone',
        })
      );

      expect(result).toMatchObject({
        includeGlossary: false,
        customInstructions: 'Use formal tone',
      });

      // Verify in database
      const dbConfig = await app.prisma.aIContextConfig.findUnique({
        where: { projectId: testProjectId },
      });
      expect(dbConfig?.includeGlossary).toBe(false);
      expect(dbConfig?.customInstructions).toBe('Use formal tone');
    });
  });

  describe('GetSupportedModelsQuery Flow', () => {
    it('should return OpenAI models', async () => {
      const result = await app.queryBus.execute(new GetSupportedModelsQuery('OPENAI'));

      expect(result.models).toContain('gpt-5.2');
      expect(result.models).toContain('gpt-5-mini');
    });

    it('should return Anthropic models', async () => {
      const result = await app.queryBus.execute(new GetSupportedModelsQuery('ANTHROPIC'));

      expect(result.models).toContain('claude-sonnet-4-5');
      expect(result.models).toContain('claude-haiku-4-5');
    });
  });

  describe('GetUsageQuery Flow', () => {
    it('should return empty usage for project with no usage', async () => {
      const result = await app.queryBus.execute(new GetUsageQuery(testProjectId, testUserId));

      expect(result.providers).toEqual([]);
    });
  });

  describe('Authorization', () => {
    it('should reject SaveConfigCommand for non-member user', async () => {
      const otherUser = await app.prisma.user.create({
        data: {
          email: 'other-user@example.com',
          name: 'Other User',
          password: 'hashed',
        },
      });

      await expect(
        app.commandBus.execute(
          new SaveConfigCommand(testProjectId, otherUser.id, {
            provider: 'OPENAI',
            apiKey: 'test-key',
            model: 'gpt-5-mini',
            isActive: true,
            priority: 1,
          })
        )
      ).rejects.toThrow();

      // Clean up
      await app.prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should reject SaveConfigCommand for DEVELOPER role (needs MANAGER or OWNER)', async () => {
      const developerUser = await app.prisma.user.create({
        data: {
          email: 'developer-user@example.com',
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
          new SaveConfigCommand(testProjectId, developerUser.id, {
            provider: 'OPENAI',
            apiKey: 'test-key',
            model: 'gpt-5-mini',
            isActive: true,
            priority: 1,
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
  });
});
