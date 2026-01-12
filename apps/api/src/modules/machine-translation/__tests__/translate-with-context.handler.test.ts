import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { KeyContextService } from '../../key-context/key-context.service.js';
import { TranslateWithContextHandler } from '../queries/translate-with-context.handler.js';
import { TranslateWithContextQuery } from '../queries/translate-with-context.query.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

describe('TranslateWithContextHandler', () => {
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

  const mockKeyContextService = {
    getAIContext: vi.fn(),
  };

  const mockLogger = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  const createHandler = () =>
    new TranslateWithContextHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService,
      mockKeyContextService as unknown as KeyContextService,
      mockLogger as unknown as FastifyBaseLogger
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.getInitializedProvider.mockResolvedValue(mockMtProvider);
  });

  it('should translate with context when AI context is available', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue(null);
    mockKeyContextService.getAIContext.mockResolvedValue({
      suggestedTerms: [{ term: 'Hello', translation: 'Hallo' }],
      relatedTranslations: [],
    });
    mockMtProvider.translate.mockResolvedValue({ text: 'Guten Tag' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateWithContextQuery('project-1', 'user-1', {
      branchId: 'branch-1',
      keyId: 'key-1',
      text: 'Good morning',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    const result = await handler.execute(query);

    expect(result.translatedText).toBe('Guten Tag');
    expect(result.context).toEqual({
      relatedTranslations: 0,
      glossaryTerms: 1,
    });
    expect(mockKeyContextService.getAIContext).toHaveBeenCalledWith('key-1', 'de', 'en');
  });

  it('should continue without context when getAIContext fails and return warning', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue(null);
    mockKeyContextService.getAIContext.mockRejectedValue(new Error('Context service error'));
    mockMtProvider.translate.mockResolvedValue({ text: 'Hallo' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateWithContextQuery('project-1', 'user-1', {
      branchId: 'branch-1',
      keyId: 'key-1',
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    const result = await handler.execute(query);

    expect(result.translatedText).toBe('Hallo');
    expect(result.context).toBeUndefined();
    expect(result.contextFetchFailed).toBe(true);
    expect(result.warning).toBe(
      'AI context could not be loaded; translation performed without context enrichment'
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should return cached translation', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue({
      translatedText: 'Hallo',
      characterCount: 5,
    });
    mockKeyContextService.getAIContext.mockResolvedValue({
      suggestedTerms: [{ term: 'Hello', translation: 'Hallo' }],
      relatedTranslations: [],
    });
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateWithContextQuery('project-1', 'user-1', {
      branchId: 'branch-1',
      keyId: 'key-1',
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    const result = await handler.execute(query);

    expect(result.translatedText).toBe('Hallo');
    expect(result.cached).toBe(true);
    expect(result.context).toEqual({
      relatedTranslations: 0,
      glossaryTerms: 1,
    });
    expect(mockMtProvider.translate).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError when text is empty', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });

    const handler = createHandler();
    const query = new TranslateWithContextQuery('project-1', 'user-1', {
      branchId: 'branch-1',
      keyId: 'key-1',
      text: '',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('should throw ForbiddenError when user has no access', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(new ForbiddenError('Not authorized'));

    const handler = createHandler();
    const query = new TranslateWithContextQuery('project-1', 'user-1', {
      branchId: 'branch-1',
      keyId: 'key-1',
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should throw BadRequestError when no provider configured', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue(null);
    mockKeyContextService.getAIContext.mockResolvedValue({
      suggestedTerms: [],
      relatedTranslations: [],
    });

    const handler = createHandler();
    const query = new TranslateWithContextQuery('project-1', 'user-1', {
      branchId: 'branch-1',
      keyId: 'key-1',
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    await expect(handler.execute(query)).rejects.toMatchObject({
      statusCode: 400,
      message: 'No MT provider configured for this project',
    });
  });

  it('should include related translations in context', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue(null);
    mockKeyContextService.getAIContext.mockResolvedValue({
      suggestedTerms: [],
      relatedTranslations: [
        { keyName: 'key.greeting', translations: { en: 'Hi', de: 'Hallo' } },
        { keyName: 'key.farewell', translations: { en: 'Bye', de: 'Tschuss' } },
      ],
    });
    mockMtProvider.translate.mockResolvedValue({ text: 'Guten Morgen' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateWithContextQuery('project-1', 'user-1', {
      branchId: 'branch-1',
      keyId: 'key-1',
      text: 'Good morning',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    const result = await handler.execute(query);

    expect(result.context).toEqual({
      relatedTranslations: 2,
      glossaryTerms: 0,
    });
  });

  it('should clean up "Translate:" prefix from provider response', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue(null);
    mockKeyContextService.getAIContext.mockResolvedValue({
      suggestedTerms: [{ term: 'Hello', translation: 'Hallo' }],
      relatedTranslations: [],
    });
    // Provider echoes back the "Translate:" prefix
    mockMtProvider.translate.mockResolvedValue({ text: 'Translate: Guten Tag' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateWithContextQuery('project-1', 'user-1', {
      branchId: 'branch-1',
      keyId: 'key-1',
      text: 'Good morning',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    const result = await handler.execute(query);

    expect(result.translatedText).toBe('Guten Tag');
  });
});
