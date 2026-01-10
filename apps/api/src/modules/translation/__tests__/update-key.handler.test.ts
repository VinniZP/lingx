import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { UpdateKeyCommand } from '../commands/update-key.command.js';
import { UpdateKeyHandler } from '../commands/update-key.handler.js';
import { KeyUpdatedEvent } from '../events/key-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('UpdateKeyHandler', () => {
  const mockRepository: {
    getProjectIdByKeyId: ReturnType<typeof vi.fn>;
    updateKey: ReturnType<typeof vi.fn>;
  } = {
    getProjectIdByKeyId: vi.fn(),
    updateKey: vi.fn(),
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

  let handler: UpdateKeyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateKeyHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should update key name and emit event', async () => {
    const command = new UpdateKeyCommand('key-1', 'common.newName', undefined, undefined, 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.newName',
      namespace: null,
      branchId: 'branch-1',
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.updateKey.mockResolvedValue(mockKey);

    const result = await handler.execute(command);

    expect(result).toEqual(mockKey);
    expect(mockAccessService.verifyKeyAccess).toHaveBeenCalledWith('user-1', 'key-1');
    expect(mockRepository.updateKey).toHaveBeenCalledWith('key-1', {
      name: 'common.newName',
      namespace: undefined,
      description: undefined,
    });
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(KeyUpdatedEvent));
  });

  it('should update key namespace', async () => {
    const command = new UpdateKeyCommand('key-1', undefined, 'errors', undefined, 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'notFound',
      namespace: 'errors',
      branchId: 'branch-1',
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.updateKey.mockResolvedValue(mockKey);

    const result = await handler.execute(command);

    expect(result.namespace).toBe('errors');
    expect(mockRepository.updateKey).toHaveBeenCalledWith('key-1', {
      name: undefined,
      namespace: 'errors',
      description: undefined,
    });
  });

  it('should update key description', async () => {
    const command = new UpdateKeyCommand(
      'key-1',
      undefined,
      undefined,
      'New description',
      'user-1'
    );

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      description: 'New description',
      branchId: 'branch-1',
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.updateKey.mockResolvedValue(mockKey);

    const result = await handler.execute(command);

    expect(result.description).toBe('New description');
  });

  it('should throw when user lacks key access', async () => {
    const command = new UpdateKeyCommand('key-1', 'newName', undefined, undefined, 'user-1');

    mockAccessService.verifyKeyAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(command)).rejects.toThrow('Not authorized');
    expect(mockRepository.updateKey).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should log warning when projectId not found', async () => {
    const command = new UpdateKeyCommand('key-1', 'newName', undefined, undefined, 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'newName',
      branchId: 'branch-1',
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.getProjectIdByKeyId.mockResolvedValue(null);
    mockRepository.updateKey.mockResolvedValue(mockKey);

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { keyId: 'key-1' },
      'Skipped KeyUpdatedEvent: projectId not found'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
