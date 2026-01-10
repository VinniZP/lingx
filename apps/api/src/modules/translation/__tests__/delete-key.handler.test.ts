import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteKeyCommand } from '../commands/delete-key.command.js';
import { DeleteKeyHandler } from '../commands/delete-key.handler.js';
import { KeyDeletedEvent } from '../events/key-deleted.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('DeleteKeyHandler', () => {
  const mockRepository: {
    getProjectIdByKeyId: ReturnType<typeof vi.fn>;
    deleteKey: ReturnType<typeof vi.fn>;
  } = {
    getProjectIdByKeyId: vi.fn(),
    deleteKey: vi.fn(),
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

  let handler: DeleteKeyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new DeleteKeyHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should delete key and emit event', async () => {
    const command = new DeleteKeyCommand('key-1', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.deleteKey.mockResolvedValue(mockKey);

    await handler.execute(command);

    expect(mockAccessService.verifyKeyAccess).toHaveBeenCalledWith('user-1', 'key-1');
    expect(mockRepository.deleteKey).toHaveBeenCalledWith('key-1');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(KeyDeletedEvent));
  });

  it('should throw when user lacks key access', async () => {
    const command = new DeleteKeyCommand('key-1', 'user-1');

    mockAccessService.verifyKeyAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(command)).rejects.toThrow('Not authorized');
    expect(mockRepository.deleteKey).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should log warning when projectId not found', async () => {
    const command = new DeleteKeyCommand('key-1', 'user-1');

    const mockKey = {
      id: 'key-1',
      name: 'common.greeting',
      branchId: 'branch-1',
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.getProjectIdByKeyId.mockResolvedValue(null);
    mockRepository.deleteKey.mockResolvedValue(mockKey);

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { keyId: 'key-1' },
      'Skipped KeyDeletedEvent: projectId not found'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw when key not found', async () => {
    const command = new DeleteKeyCommand('non-existent', 'user-1');

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.getProjectIdByKeyId.mockResolvedValue('project-1');
    mockRepository.deleteKey.mockRejectedValue(new Error('Key not found'));

    await expect(handler.execute(command)).rejects.toThrow('Key not found');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
