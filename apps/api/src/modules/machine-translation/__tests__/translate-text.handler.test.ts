import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../access/access.service.js';
import { TranslateTextHandler } from '../queries/translate-text.handler.js';
import { TranslateTextQuery } from '../queries/translate-text.query.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

describe('TranslateTextHandler', () => {
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

  const createHandler = () =>
    new TranslateTextHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.getInitializedProvider.mockResolvedValue(mockMtProvider);
  });

  it('should translate text when not cached', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue(null);
    mockMtProvider.translate.mockResolvedValue({ text: 'Hallo' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateTextQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    const result = await handler.execute(query);

    expect(result).toEqual({
      translatedText: 'Hallo',
      provider: 'DEEPL',
      cached: false,
      characterCount: 5,
    });
    expect(mockMtProvider.translate).toHaveBeenCalledWith('Hello', 'en', 'de');
    expect(mockRepository.cacheTranslation).toHaveBeenCalledWith(
      'project-1',
      'DEEPL',
      'en',
      'de',
      'Hello',
      'Hallo',
      5
    );
    expect(mockRepository.updateUsage).toHaveBeenCalledWith('project-1', 'DEEPL', 5, 1, 0);
  });

  it('should return cached translation when available', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue('DEEPL');
    mockRepository.getCachedTranslation.mockResolvedValue({
      translatedText: 'Hallo',
      characterCount: 5,
    });
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateTextQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    const result = await handler.execute(query);

    expect(result).toEqual({
      translatedText: 'Hallo',
      provider: 'DEEPL',
      cached: true,
      characterCount: 5,
    });
    expect(mockMtProvider.translate).not.toHaveBeenCalled();
    expect(mockRepository.cacheTranslation).not.toHaveBeenCalled();
    expect(mockRepository.updateUsage).toHaveBeenCalledWith('project-1', 'DEEPL', 0, 0, 1);
  });

  it('should use specified provider when provided', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getCachedTranslation.mockResolvedValue(null);
    mockMtProvider.translate.mockResolvedValue({ text: 'Hola' });
    mockRepository.cacheTranslation.mockResolvedValue(undefined);
    mockRepository.updateUsage.mockResolvedValue(undefined);

    const handler = createHandler();
    const query = new TranslateTextQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      provider: 'GOOGLE_TRANSLATE',
    });

    const result = await handler.execute(query);

    expect(result.provider).toBe('GOOGLE_TRANSLATE');
    expect(mockRepository.selectProvider).not.toHaveBeenCalled();
    expect(mockRepository.getInitializedProvider).toHaveBeenCalledWith(
      'project-1',
      'GOOGLE_TRANSLATE'
    );
  });

  it('should throw BadRequestError when text is empty', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });

    const handler = createHandler();
    const query = new TranslateTextQuery('project-1', 'user-1', {
      text: '',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    await expect(handler.execute(query)).rejects.toThrow(AppError);
    await expect(handler.execute(query)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Text to translate cannot be empty',
    });
  });

  it('should throw BadRequestError when no provider configured', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.selectProvider.mockResolvedValue(null);

    const handler = createHandler();
    const query = new TranslateTextQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    await expect(handler.execute(query)).rejects.toThrow(AppError);
    await expect(handler.execute(query)).rejects.toMatchObject({
      statusCode: 400,
      message: 'No MT provider configured for this project',
    });
  });

  it('should throw ForbiddenError when user has no project access', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Not authorized to access this project')
    );

    const handler = createHandler();
    const query = new TranslateTextQuery('project-1', 'user-1', {
      text: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });

    await expect(handler.execute(query)).rejects.toThrow(AppError);
    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 403 });
  });
});
