import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { SetTranslationCommand } from '../commands/set-translation.command.js';
import { SetTranslationHandler } from '../commands/set-translation.handler.js';
import { TranslationUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('SetTranslationHandler', () => {
  const mockRepository: {
    findKeyById: ReturnType<typeof vi.fn>;
    getProjectIdByKeyId: ReturnType<typeof vi.fn>;
    setTranslation: ReturnType<typeof vi.fn>;
  } = {
    findKeyById: vi.fn(),
    getProjectIdByKeyId: vi.fn(),
    setTranslation: vi.fn(),
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

  let handler: SetTranslationHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SetTranslationHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should set translation and emit event when value changes', async () => {
    const command = new SetTranslationCommand('key-1', 'es', 'Hola', 'user-1');

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
    mockRepository.setTranslation.mockResolvedValue(mockTranslation);

    const result = await handler.execute(command);

    expect(result).toEqual(mockTranslation);
    expect(mockAccessService.verifyKeyAccess).toHaveBeenCalledWith('user-1', 'key-1');
    expect(mockRepository.setTranslation).toHaveBeenCalledWith('key-1', 'es', 'Hola');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TranslationUpdatedEvent));
  });

  it('should not emit event when value is unchanged', async () => {
    const command = new SetTranslationCommand('key-1', 'es', 'Hola', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [{ language: 'es', value: 'Hola' }], // Same value
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
    mockRepository.setTranslation.mockResolvedValue(mockTranslation);

    await handler.execute(command);

    expect(mockEventBus.publish).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled(); // No warning for same value
  });

  it('should update existing translation', async () => {
    const command = new SetTranslationCommand('key-1', 'es', 'Hola mundo', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [{ language: 'es', value: 'Hola' }], // Old value
    };

    const mockTranslation = {
      id: 'translation-1',
      keyId: 'key-1',
      language: 'es',
      value: 'Hola mundo',
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.setTranslation.mockResolvedValue(mockTranslation);

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TranslationUpdatedEvent));
  });

  it('should throw when user lacks key access', async () => {
    const command = new SetTranslationCommand('key-1', 'es', 'Hola', 'user-1');

    mockAccessService.verifyKeyAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(command)).rejects.toThrow('Not authorized');
    expect(mockRepository.setTranslation).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should log warning when projectId not found', async () => {
    const command = new SetTranslationCommand('key-1', 'es', 'Hola', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
      translations: [],
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(mockKey);
    mockRepository.getProjectIdByKeyId.mockResolvedValue(null);
    mockRepository.setTranslation.mockResolvedValue({});

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { keyId: 'key-1' },
      'Skipped TranslationUpdatedEvent: projectId not found'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should log warning when key not found', async () => {
    const command = new SetTranslationCommand('key-1', 'es', 'Hola', 'user-1');

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(null);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.setTranslation.mockResolvedValue({});

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { keyId: 'key-1' },
      'Skipped TranslationUpdatedEvent: key not found'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
