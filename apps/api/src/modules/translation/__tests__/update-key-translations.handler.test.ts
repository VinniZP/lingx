import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { UpdateKeyTranslationsCommand } from '../commands/update-key-translations.command.js';
import { UpdateKeyTranslationsHandler } from '../commands/update-key-translations.handler.js';
import { KeyTranslationsUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('UpdateKeyTranslationsHandler', () => {
  const mockRepository: {
    findKeyById: ReturnType<typeof vi.fn>;
    getProjectIdByKeyId: ReturnType<typeof vi.fn>;
    updateKeyTranslations: ReturnType<typeof vi.fn>;
  } = {
    findKeyById: vi.fn(),
    getProjectIdByKeyId: vi.fn(),
    updateKeyTranslations: vi.fn(),
  };

  const mockAccessService: {
    verifyKeyAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyKeyAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const mockLogger: { warn: ReturnType<typeof vi.fn> } = {
    warn: vi.fn(),
  };

  let handler: UpdateKeyTranslationsHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateKeyTranslationsHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should update multiple translations and emit event', async () => {
    const translations = { es: 'Hola', fr: 'Bonjour' };
    const command = new UpdateKeyTranslationsCommand('key-1', translations, 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [{ language: 'en', value: 'Hello' }],
    };

    const mockResult = {
      id: 'key-1',
      translations: [
        { language: 'en', value: 'Hello' },
        { language: 'es', value: 'Hola' },
        { language: 'fr', value: 'Bonjour' },
      ],
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.updateKeyTranslations.mockResolvedValue(mockResult);

    const result = await handler.execute(command);

    expect(result).toEqual(mockResult);
    expect(mockAccessService.verifyKeyAccess).toHaveBeenCalledWith('user-1', 'key-1');
    expect(mockRepository.updateKeyTranslations).toHaveBeenCalledWith('key-1', translations);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(KeyTranslationsUpdatedEvent));
  });

  it('should not emit event when no translations changed', async () => {
    const translations = { es: 'Hola' };
    const command = new UpdateKeyTranslationsCommand('key-1', translations, 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [{ language: 'es', value: 'Hola' }], // Same value
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.updateKeyTranslations.mockResolvedValue(mockKey);

    await handler.execute(command);

    expect(mockEventBus.publish).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should only track changed languages in event', async () => {
    const translations = { es: 'Hola', fr: 'Bonjour', de: 'Hallo' };
    const command = new UpdateKeyTranslationsCommand('key-1', translations, 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [
        { language: 'es', value: 'Hola' }, // Same
        { language: 'fr', value: 'Salut' }, // Changed
      ],
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.updateKeyTranslations.mockResolvedValue({});

    await handler.execute(command);

    // Should emit event with only changed languages (fr, de - not es)
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it('should throw when user lacks key access', async () => {
    const command = new UpdateKeyTranslationsCommand('key-1', { es: 'Hola' }, 'user-1');

    mockAccessService.verifyKeyAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(command)).rejects.toThrow('Not authorized');
    expect(mockRepository.updateKeyTranslations).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should log warning when projectId not found', async () => {
    const translations = { es: 'Hola' };
    const command = new UpdateKeyTranslationsCommand('key-1', translations, 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [],
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue(null);
    mockRepository.updateKeyTranslations.mockResolvedValue({});

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { keyId: 'key-1' },
      'Skipped KeyTranslationsUpdatedEvent: projectId not found'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should log warning when key not found', async () => {
    const command = new UpdateKeyTranslationsCommand('key-1', { es: 'Hola' }, 'user-1');

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(null);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.updateKeyTranslations.mockResolvedValue({});

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { keyId: 'key-1' },
      'Skipped KeyTranslationsUpdatedEvent: key not found'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
