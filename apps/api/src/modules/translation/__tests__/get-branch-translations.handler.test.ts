import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { GetBranchTranslationsHandler } from '../queries/get-branch-translations.handler.js';
import { GetBranchTranslationsQuery } from '../queries/get-branch-translations.query.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('GetBranchTranslationsHandler', () => {
  const mockRepository: {
    getBranchTranslations: ReturnType<typeof vi.fn>;
  } = {
    getBranchTranslations: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
  };

  let handler: GetBranchTranslationsHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetBranchTranslationsHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService
    );
  });

  it('should get all translations for a branch', async () => {
    const query = new GetBranchTranslationsQuery('branch-1', 'user-1');

    const mockTranslations = {
      translations: {
        'common.greeting': { en: 'Hello', es: 'Hola' },
        'common.farewell': { en: 'Goodbye', es: 'Adiós' },
      },
      languages: ['en', 'es'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.getBranchTranslations.mockResolvedValue(mockTranslations);

    const result = await handler.execute(query);

    expect(result).toEqual(mockTranslations);
    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockRepository.getBranchTranslations).toHaveBeenCalledWith('branch-1');
  });

  it('should return empty translations when branch has no keys', async () => {
    const query = new GetBranchTranslationsQuery('branch-1', 'user-1');

    const mockTranslations = {
      translations: {},
      languages: ['en'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockRepository.getBranchTranslations.mockResolvedValue(mockTranslations);

    const result = await handler.execute(query);

    expect(result.translations).toEqual({});
  });

  it('should throw when user lacks branch access', async () => {
    const query = new GetBranchTranslationsQuery('branch-1', 'user-1');

    mockAccessService.verifyBranchAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(query)).rejects.toThrow('Not authorized');
    expect(mockRepository.getBranchTranslations).not.toHaveBeenCalled();
  });

  it('should handle namespaced keys', async () => {
    const query = new GetBranchTranslationsQuery('branch-1', 'user-1');

    const mockTranslations = {
      translations: {
        'errors:notFound': { en: 'Not found', es: 'No encontrado' },
        'errors:forbidden': { en: 'Forbidden', es: 'Prohibido' },
        greeting: { en: 'Hello', es: 'Hola' },
      },
      languages: ['en', 'es'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.getBranchTranslations.mockResolvedValue(mockTranslations);

    const result = await handler.execute(query);

    expect(Object.keys(result.translations)).toHaveLength(3);
    expect(result.translations['errors:notFound']).toBeDefined();
  });

  it('should include all project languages', async () => {
    const query = new GetBranchTranslationsQuery('branch-1', 'user-1');

    const mockTranslations = {
      translations: {
        key1: { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch' },
      },
      languages: ['en', 'es', 'fr', 'de'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es', 'fr', 'de'],
    });
    mockRepository.getBranchTranslations.mockResolvedValue(mockTranslations);

    const result = await handler.execute(query);

    expect(result.languages).toEqual(['en', 'es', 'fr', 'de']);
  });
});
