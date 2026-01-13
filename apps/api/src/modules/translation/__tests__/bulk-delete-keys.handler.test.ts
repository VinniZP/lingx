import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { BulkDeleteKeysCommand } from '../commands/bulk-delete-keys.command.js';
import { BulkDeleteKeysHandler } from '../commands/bulk-delete-keys.handler.js';
import { KeysDeletedEvent } from '../events/key-deleted.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('BulkDeleteKeysHandler', () => {
  const mockRepository: {
    bulkDeleteKeys: ReturnType<typeof vi.fn>;
  } = {
    bulkDeleteKeys: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  let handler: BulkDeleteKeysHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new BulkDeleteKeysHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  it('should delete keys and emit event', async () => {
    const keyIds = ['key-1', 'key-2', 'key-3'];
    const command = new BulkDeleteKeysCommand('branch-1', keyIds, 'user-1');

    const deletedKeys = [
      { id: 'key-1', name: 'common.greeting', namespace: null, branchId: 'branch-1' },
      { id: 'key-2', name: 'common.farewell', namespace: null, branchId: 'branch-1' },
      { id: 'key-3', name: 'errors.notFound', namespace: 'errors', branchId: 'branch-1' },
    ];

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.bulkDeleteKeys.mockResolvedValue({ count: 3, keys: deletedKeys });

    const result = await handler.execute(command);

    expect(result).toBe(3);
    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockRepository.bulkDeleteKeys).toHaveBeenCalledWith('branch-1', keyIds);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(KeysDeletedEvent));
  });

  it('should not emit event when no keys are deleted', async () => {
    const command = new BulkDeleteKeysCommand('branch-1', ['non-existent'], 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.bulkDeleteKeys.mockResolvedValue({ count: 0, keys: [] });

    const result = await handler.execute(command);

    expect(result).toBe(0);
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw when user lacks branch access', async () => {
    const command = new BulkDeleteKeysCommand('branch-1', ['key-1'], 'user-1');

    mockAccessService.verifyBranchAccess.mockRejectedValue(
      new Error('Not authorized to access this branch')
    );

    await expect(handler.execute(command)).rejects.toThrow('Not authorized to access this branch');
    expect(mockRepository.bulkDeleteKeys).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should delete keys in all-or-nothing transaction', async () => {
    const keyIds = ['key-1', 'key-2'];
    const command = new BulkDeleteKeysCommand('branch-1', keyIds, 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.bulkDeleteKeys.mockRejectedValue(new Error('Transaction failed'));

    await expect(handler.execute(command)).rejects.toThrow('Transaction failed');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
