import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { BulkUpdateKeyContextCommand } from '../commands/bulk-update-key-context.command.js';
import { BulkUpdateKeyContextHandler } from '../commands/bulk-update-key-context.handler.js';
import { KeyContextUpdatedEvent } from '../events/key-context-updated.event.js';
import type { KeyContextService } from '../key-context.service.js';

describe('BulkUpdateKeyContextHandler', () => {
  const mockKeyContextService: { updateKeyContext: ReturnType<typeof vi.fn> } = {
    updateKeyContext: vi.fn(),
  };

  const mockAccessService: { verifyBranchAccess: ReturnType<typeof vi.fn> } = {
    verifyBranchAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new BulkUpdateKeyContextHandler(
      mockKeyContextService as unknown as KeyContextService,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update key context and emit event when user is authorized', async () => {
    const handler = createHandler();

    const keys = [
      { name: 'common.button.save', namespace: null, sourceFile: 'src/Button.tsx', sourceLine: 10 },
      {
        name: 'common.button.cancel',
        namespace: null,
        sourceFile: 'src/Button.tsx',
        sourceLine: 15,
      },
    ];

    const updateResult = { updated: 2, notFound: 0 };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      role: 'MAINTAINER',
    });
    mockKeyContextService.updateKeyContext.mockResolvedValue(updateResult);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new BulkUpdateKeyContextCommand('branch-1', keys, 'user-1');

    const result = await handler.execute(command);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockKeyContextService.updateKeyContext).toHaveBeenCalledWith('branch-1', keys);

    // Verify event was published with correct payload
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as KeyContextUpdatedEvent;
    expect(publishedEvent).toBeInstanceOf(KeyContextUpdatedEvent);
    expect(publishedEvent.branchId).toBe('branch-1');
    expect(publishedEvent.updated).toBe(2);
    expect(publishedEvent.notFound).toBe(0);
    expect(publishedEvent.userId).toBe('user-1');

    expect(result).toEqual(updateResult);
  });

  it('should throw ForbiddenError when user is not authorized', async () => {
    const handler = createHandler();

    const forbiddenError = new ForbiddenError();
    mockAccessService.verifyBranchAccess.mockRejectedValue(forbiddenError);

    const command = new BulkUpdateKeyContextCommand(
      'branch-1',
      [{ name: 'test.key', namespace: null }],
      'user-1'
    );

    await expect(handler.execute(command)).rejects.toBe(forbiddenError);

    expect(mockKeyContextService.updateKeyContext).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate service exceptions', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      role: 'MAINTAINER',
    });
    mockKeyContextService.updateKeyContext.mockRejectedValue(
      new Error('Database connection failed')
    );

    const command = new BulkUpdateKeyContextCommand(
      'branch-1',
      [{ name: 'test.key', namespace: null }],
      'user-1'
    );

    await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate event bus failures', async () => {
    const handler = createHandler();

    const keys = [{ name: 'test.key', namespace: null }];
    const updateResult = { updated: 1, notFound: 0 };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      role: 'MAINTAINER',
    });
    mockKeyContextService.updateKeyContext.mockResolvedValue(updateResult);
    mockEventBus.publish.mockRejectedValue(new Error('Event bus unavailable'));

    const command = new BulkUpdateKeyContextCommand('branch-1', keys, 'user-1');

    await expect(handler.execute(command)).rejects.toThrow('Event bus unavailable');
  });

  it('should handle partial updates (some keys not found)', async () => {
    const handler = createHandler();

    const keys = [
      { name: 'existing.key', namespace: null, sourceFile: 'src/App.tsx' },
      { name: 'missing.key', namespace: null, sourceFile: 'src/App.tsx' },
    ];

    const updateResult = { updated: 1, notFound: 1 };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      role: 'MAINTAINER',
    });
    mockKeyContextService.updateKeyContext.mockResolvedValue(updateResult);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new BulkUpdateKeyContextCommand('branch-1', keys, 'user-1');

    const result = await handler.execute(command);

    expect(result).toEqual({ updated: 1, notFound: 1 });

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as KeyContextUpdatedEvent;
    expect(publishedEvent.updated).toBe(1);
    expect(publishedEvent.notFound).toBe(1);
  });

  it('should handle empty keys array', async () => {
    const handler = createHandler();

    const updateResult = { updated: 0, notFound: 0 };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      role: 'MAINTAINER',
    });
    mockKeyContextService.updateKeyContext.mockResolvedValue(updateResult);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new BulkUpdateKeyContextCommand('branch-1', [], 'user-1');

    const result = await handler.execute(command);

    expect(result).toEqual({ updated: 0, notFound: 0 });
    expect(mockKeyContextService.updateKeyContext).toHaveBeenCalledWith('branch-1', []);
  });
});
