import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { BulkUpdateTranslationsCommand } from '../commands/bulk-update-translations.command.js';
import { BulkUpdateTranslationsHandler } from '../commands/bulk-update-translations.handler.js';
import { TranslationsImportedEvent } from '../events/translations-imported.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('BulkUpdateTranslationsHandler', () => {
  const mockRepository: {
    bulkUpdateTranslations: ReturnType<typeof vi.fn>;
  } = {
    bulkUpdateTranslations: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  let handler: BulkUpdateTranslationsHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new BulkUpdateTranslationsHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  it('should bulk update translations and emit event', async () => {
    const translations = {
      'common.greeting': { en: 'Hello', es: 'Hola' },
      'common.farewell': { en: 'Goodbye', es: 'Adiós' },
    };
    const command = new BulkUpdateTranslationsCommand('branch-1', translations, 'user-1');

    const mockResult = { created: 4, updated: 0 };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.bulkUpdateTranslations.mockResolvedValue(mockResult);

    const result = await handler.execute(command);

    expect(result).toEqual(mockResult);
    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockRepository.bulkUpdateTranslations).toHaveBeenCalledWith('branch-1', translations);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TranslationsImportedEvent));
  });

  it('should collect all languages from translations', async () => {
    const translations = {
      key1: { en: 'Hello', es: 'Hola', fr: 'Bonjour' },
      key2: { en: 'World', de: 'Welt' },
    };
    const command = new BulkUpdateTranslationsCommand('branch-1', translations, 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es', 'fr', 'de'],
    });
    mockRepository.bulkUpdateTranslations.mockResolvedValue({ created: 5, updated: 0 });

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalled();
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as TranslationsImportedEvent;
    expect(publishedEvent.languages.sort()).toEqual(['de', 'en', 'es', 'fr']);
  });

  it('should not emit event when no keys provided', async () => {
    const translations = {};
    const command = new BulkUpdateTranslationsCommand('branch-1', translations, 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.bulkUpdateTranslations.mockResolvedValue({ created: 0, updated: 0 });

    await handler.execute(command);

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw when user lacks branch access', async () => {
    const translations = { key1: { en: 'Hello' } };
    const command = new BulkUpdateTranslationsCommand('branch-1', translations, 'user-1');

    mockAccessService.verifyBranchAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(command)).rejects.toThrow('Not authorized');
    expect(mockRepository.bulkUpdateTranslations).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should handle single key with single language', async () => {
    const translations = {
      'simple.key': { en: 'Simple value' },
    };
    const command = new BulkUpdateTranslationsCommand('branch-1', translations, 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockRepository.bulkUpdateTranslations.mockResolvedValue({ created: 1, updated: 0 });

    const result = await handler.execute(command);

    expect(result).toEqual({ created: 1, updated: 0 });
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it('should pass correct key count to event', async () => {
    const translations = {
      key1: { en: 'A' },
      key2: { en: 'B' },
      key3: { en: 'C' },
    };
    const command = new BulkUpdateTranslationsCommand('branch-1', translations, 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockRepository.bulkUpdateTranslations.mockResolvedValue({ created: 3, updated: 0 });

    await handler.execute(command);

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as TranslationsImportedEvent;
    expect(publishedEvent.keyCount).toBe(3);
  });
});
