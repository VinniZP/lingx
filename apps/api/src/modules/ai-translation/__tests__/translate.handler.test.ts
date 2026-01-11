import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { TranslateHandler } from '../queries/translate.handler.js';
import { TranslateQuery } from '../queries/translate.query.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';
import type { AIProviderService } from '../services/ai-provider.service.js';

// Mock the 'ai' module
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: '<translation>Bonjour, monde!</translation>',
    usage: { inputTokens: 50, outputTokens: 20 },
  }),
}));

describe('TranslateHandler', () => {
  const mockRepository: {
    getConfig: ReturnType<typeof vi.fn>;
    selectProvider: ReturnType<typeof vi.fn>;
    getCachedTranslation: ReturnType<typeof vi.fn>;
    cacheTranslation: ReturnType<typeof vi.fn>;
    updateUsage: ReturnType<typeof vi.fn>;
    getContextConfig: ReturnType<typeof vi.fn>;
    getProject: ReturnType<typeof vi.fn>;
  } = {
    getConfig: vi.fn(),
    selectProvider: vi.fn(),
    getCachedTranslation: vi.fn(),
    cacheTranslation: vi.fn(),
    updateUsage: vi.fn(),
    getContextConfig: vi.fn(),
    getProject: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const mockProviderService: { getLanguageModel: ReturnType<typeof vi.fn> } = {
    getLanguageModel: vi.fn(),
  };

  const mockLogger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  } = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const createHandler = () =>
    new TranslateHandler(
      mockRepository as unknown as AITranslationRepository,
      mockAccessService as unknown as AccessService,
      mockProviderService as unknown as AIProviderService,
      mockLogger as unknown as FastifyBaseLogger
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached translation when available', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.selectProvider.mockResolvedValue('OPENAI');
    mockRepository.getConfig.mockResolvedValue({
      id: 'config-1',
      provider: 'OPENAI',
      model: 'gpt-5-mini',
      apiKey: 'sk-123',
      isActive: true,
    });
    mockRepository.getCachedTranslation.mockResolvedValue({
      translatedText: 'Bonjour le monde!',
      tokenCount: 0,
    });
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const query = new TranslateQuery('project-1', 'user-1', {
      text: 'Hello world',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    });

    const result = await handler.execute(query);

    expect(result.text).toBe('Bonjour le monde!');
    expect(result.cached).toBe(true);
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
    expect(mockRepository.updateUsage).toHaveBeenCalledWith(
      'project-1',
      'OPENAI',
      'gpt-5-mini',
      0,
      0,
      0,
      1
    );
  });

  it('should throw when user does not have access', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const query = new TranslateQuery('project-1', 'user-1', {
      text: 'Hello world',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    });

    await expect(handler.execute(query)).rejects.toThrow('Forbidden');
  });

  it('should throw when no provider is configured', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.selectProvider.mockResolvedValue(null);

    const query = new TranslateQuery('project-1', 'user-1', {
      text: 'Hello world',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    });

    await expect(handler.execute(query)).rejects.toThrow('No AI provider configured');
  });

  it('should throw when text is empty', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);

    const query = new TranslateQuery('project-1', 'user-1', {
      text: '  ',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    });

    await expect(handler.execute(query)).rejects.toThrow('Text to translate cannot be empty');
  });

  it('should throw when text exceeds maximum length', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);

    // Create text longer than 10,000 characters
    const longText = 'a'.repeat(10_001);

    const query = new TranslateQuery('project-1', 'user-1', {
      text: longText,
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    });

    await expect(handler.execute(query)).rejects.toThrow('Text exceeds maximum length');
  });

  it('should throw when provider config is not found', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.selectProvider.mockResolvedValue('OPENAI');
    mockRepository.getConfig.mockResolvedValue(null);

    const query = new TranslateQuery('project-1', 'user-1', {
      text: 'Hello world',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    });

    await expect(handler.execute(query)).rejects.toThrow('not found');
  });
});
