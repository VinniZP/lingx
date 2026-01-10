import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { SetTranslationWithQualityCommand } from '../commands/set-translation-with-quality.command.js';
import { SetTranslationWithQualityHandler } from '../commands/set-translation-with-quality.handler.js';
import { TranslationUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('SetTranslationWithQualityHandler', () => {
  const mockRepository: {
    findKeyById: ReturnType<typeof vi.fn>;
    getProjectIdByKeyId: ReturnType<typeof vi.fn>;
    getBranchInfo: ReturnType<typeof vi.fn>;
    setTranslationWithQuality: ReturnType<typeof vi.fn>;
  } = {
    findKeyById: vi.fn(),
    getProjectIdByKeyId: vi.fn(),
    getBranchInfo: vi.fn(),
    setTranslationWithQuality: vi.fn(),
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

  let handler: SetTranslationWithQualityHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SetTranslationWithQualityHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should set translation with quality check and emit event', async () => {
    const command = new SetTranslationWithQualityCommand('key-1', 'es', 'Hola', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [{ language: 'en', value: 'Hello' }],
    };

    const mockTranslation = {
      id: 'translation-1',
      keyId: 'key-1',
      language: 'es',
      value: 'Hola',
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.getBranchInfo.mockResolvedValue({ sourceLanguage: 'en' });
    mockRepository.setTranslationWithQuality.mockResolvedValue({
      translation: mockTranslation,
      qualityIssues: [],
    });

    const result = await handler.execute(command);

    expect(result.translation).toEqual(mockTranslation);
    expect(result.qualityIssues).toEqual([]);
    expect(mockRepository.setTranslationWithQuality).toHaveBeenCalledWith(
      'key-1',
      'es',
      'Hola',
      'en'
    );
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TranslationUpdatedEvent));
  });

  it('should return quality issues when found', async () => {
    const command = new SetTranslationWithQualityCommand('key-1', 'es', 'Hola.', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [{ language: 'en', value: 'Hello' }], // No period
    };

    const qualityIssues = [
      { type: 'PUNCTUATION_MISMATCH', message: 'Punctuation differs from source' },
    ];

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.getBranchInfo.mockResolvedValue({ sourceLanguage: 'en' });
    mockRepository.setTranslationWithQuality.mockResolvedValue({
      translation: { id: 't1', value: 'Hola.' },
      qualityIssues,
    });

    const result = await handler.execute(command);

    expect(result.qualityIssues).toEqual(qualityIssues);
  });

  it('should use fallback source language when branchInfo not found', async () => {
    const command = new SetTranslationWithQualityCommand('key-1', 'es', 'Hola', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [],
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.getBranchInfo.mockResolvedValue(null);
    mockRepository.setTranslationWithQuality.mockResolvedValue({
      translation: { id: 't1', value: 'Hola' },
      qualityIssues: [],
    });

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { keyId: 'key-1' },
      'Using fallback source language "en" for quality check'
    );
    expect(mockRepository.setTranslationWithQuality).toHaveBeenCalledWith(
      'key-1',
      'es',
      'Hola',
      'en'
    );
  });

  it('should not emit event when value is unchanged', async () => {
    const command = new SetTranslationWithQualityCommand('key-1', 'es', 'Hola', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [{ language: 'es', value: 'Hola' }], // Same value
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.getBranchInfo.mockResolvedValue({ sourceLanguage: 'en' });
    mockRepository.setTranslationWithQuality.mockResolvedValue({
      translation: { id: 't1', value: 'Hola' },
      qualityIssues: [],
    });

    await handler.execute(command);

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw when user lacks key access', async () => {
    const command = new SetTranslationWithQualityCommand('key-1', 'es', 'Hola', 'user-1');

    mockAccessService.verifyKeyAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(command)).rejects.toThrow('Not authorized');
    expect(mockRepository.setTranslationWithQuality).not.toHaveBeenCalled();
  });

  it('should log warning when projectId not found', async () => {
    const command = new SetTranslationWithQualityCommand('key-1', 'es', 'Hola', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [],
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue(null);
    mockRepository.getBranchInfo.mockResolvedValue({ sourceLanguage: 'en' });
    mockRepository.setTranslationWithQuality.mockResolvedValue({
      translation: { id: 't1', value: 'Hola' },
      qualityIssues: [],
    });

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { keyId: 'key-1' },
      'Skipped TranslationUpdatedEvent: projectId not found'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
