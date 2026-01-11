/**
 * RevokeAllSessionsHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { RevokeAllSessionsCommand } from '../commands/revoke-all-sessions.command.js';
import { RevokeAllSessionsHandler } from '../commands/revoke-all-sessions.handler.js';
import { AllSessionsRevokedEvent } from '../events/all-sessions-revoked.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';

describe('RevokeAllSessionsHandler', () => {
  let mockRepository: {
    deleteAllExcept: ReturnType<typeof vi.fn>;
  };
  let mockCache: {
    invalidateAllExcept: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = { deleteAllExcept: vi.fn() };
    mockCache = { invalidateAllExcept: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new RevokeAllSessionsHandler(
      mockRepository as unknown as SessionRepository,
      mockCache as unknown as SessionCacheService,
      mockEventBus as unknown as IEventBus
    );

  it('should revoke all sessions except current and publish AllSessionsRevokedEvent', async () => {
    // Arrange
    mockRepository.deleteAllExcept.mockResolvedValue(3);

    const handler = createHandler();
    const command = new RevokeAllSessionsCommand('user-123', 'current-session-123');

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(mockRepository.deleteAllExcept).toHaveBeenCalledWith('user-123', 'current-session-123');
    expect(mockCache.invalidateAllExcept).toHaveBeenCalledWith('user-123', 'current-session-123');
    expect(result).toEqual({ revokedCount: 3 });

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as AllSessionsRevokedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.revokedCount).toBe(3);
    expect(publishedEvent.currentSessionId).toBe('current-session-123');
  });

  it('should return 0 when no other sessions exist', async () => {
    // Arrange
    mockRepository.deleteAllExcept.mockResolvedValue(0);

    const handler = createHandler();
    const command = new RevokeAllSessionsCommand('user-123', 'only-session');

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result).toEqual({ revokedCount: 0 });
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('should propagate repository errors', async () => {
    // Arrange
    mockRepository.deleteAllExcept.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();
    const command = new RevokeAllSessionsCommand('user-123', 'current-session');

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
