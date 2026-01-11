import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import { TranslateMultiHandler } from '../queries/translate-multi.handler.js';
import { TranslateMultiQuery } from '../queries/translate-multi.query.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

describe('TranslateMultiHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockMtProvider = {
    translate: vi.fn(),
  };

  const mockRepository = {
    selectProvider: vi.fn(),
    getCachedTranslation: vi.fn(),
    getInitializedProvider: vi.fn(),
    cacheTranslation: vi.fn(),
    updateUsage: vi.fn(),
  };

  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };

  const createHandler = () =>
    new TranslateMultiHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService,
      mockLogger as unknown as FastifyBaseLogger
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.getInitializedProvider.mockResolvedValue(mockMtProvider);
  });

  it('should translate to multiple languages', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue(null);
    mockMtProvider.translate
      .mockResolvedValueOnce({ text: 'Hallo' })
      .mockResolvedValueOnce({ text: 'Bonjour' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateMultiQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguages: ['de', 'fr'],
    });

    const result = await handler.execute(query);

    expect(result.translations).toEqual({
      de: {
        translatedText: 'Hallo',
        provider: 'DEEPL',
        cached: false,
        characterCount: 5,
      },
      fr: {
        translatedText: 'Bonjour',
        provider: 'DEEPL',
        cached: false,
        characterCount: 5,
      },
    });
    expect(result.totalCharacters).toBe(10);
  });

  it('should use cached translations when available', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation
      .mockResolvedValueOnce({ translatedText: 'Hallo', characterCount: 5 })
      .mockResolvedValueOnce(null);
    mockMtProvider.translate.mockResolvedValueOnce({ text: 'Bonjour' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateMultiQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguages: ['de', 'fr'],
    });

    const result = await handler.execute(query);

    expect(result.translations.de.cached).toBe(true);
    expect(result.translations.fr.cached).toBe(false);
    expect(mockMtProvider.translate).toHaveBeenCalledTimes(1); // Only fr
  });

  it('should continue on translation failure and return errors', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue(null);
    mockMtProvider.translate
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce({ text: 'Bonjour' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateMultiQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguages: ['de', 'fr'],
    });

    const result = await handler.execute(query);

    expect(result.translations).toEqual({
      fr: {
        translatedText: 'Bonjour',
        provider: 'DEEPL',
        cached: false,
        characterCount: 5,
      },
    });
    expect(result.translations.de).toBeUndefined();
    expect(result.errors).toEqual([{ language: 'de', error: 'API error' }]);
    expect(result.partialSuccess).toBe(true);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw BadRequestError when text is empty', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });

    const handler = createHandler();
    const query = new TranslateMultiQuery('project-1', 'user-1', {
      text: '',
      sourceLanguage: 'en',
      targetLanguages: ['de'],
    });

    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('should throw ForbiddenError when user has no access', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(new ForbiddenError('Not authorized'));

    const handler = createHandler();
    const query = new TranslateMultiQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguages: ['de'],
    });

    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should throw BadRequestError when no provider configured', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue(null);

    const handler = createHandler();
    const query = new TranslateMultiQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguages: ['de'],
    });

    await expect(handler.execute(query)).rejects.toMatchObject({
      statusCode: 400,
      message: 'No MT provider configured for this project',
    });
  });
});
