/**
 * DeleteSessionHandler Unit Tests
 */
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteSessionCommand } from '../commands/delete-session.command.js';
import { DeleteSessionHandler } from '../commands/delete-session.handler.js';
import { SessionDeletedEvent } from '../events/session-deleted.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';

describe('DeleteSessionHandler', () => {
  let mockRepository: {
    delete: ReturnType<typeof vi.fn>;
  };
  let mockCache: {
    invalidate: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    warn: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = { delete: vi.fn() };
    mockCache = { invalidate: vi.fn() };
    mockEventBus = { publish: vi.fn() };
    mockLogger = { warn: vi.fn() };
  });

  const createHandler = () =>
    new DeleteSessionHandler(
      mockRepository as unknown as SessionRepository,
      mockCache as unknown as SessionCacheService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );

  it('should delete session, invalidate cache, and publish SessionDeletedEvent', async () => {
    // Arrange
    mockRepository.delete.mockResolvedValue(true);
    mockCache.invalidate.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteSessionCommand('session-123', 'user-456');

    // Act
    await handler.execute(command);

    // Assert
    expect(mockRepository.delete).toHaveBeenCalledWith('session-123');
    expect(mockCache.invalidate).toHaveBeenCalledWith('session-123');

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as SessionDeletedEvent;
    expect(publishedEvent).toBeInstanceOf(SessionDeletedEvent);
    expect(publishedEvent.sessionId).toBe('session-123');
    expect(publishedEvent.userId).toBe('user-456');
  });

  it('should still invalidate cache and publish event even if session not found in DB', async () => {
    // Arrange - session already deleted in DB
    mockRepository.delete.mockResolvedValue(false);
    mockCache.invalidate.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteSessionCommand('already-deleted-session', 'user-456');

    // Act
    await handler.execute(command);

    // Assert - should still complete gracefully
    expect(mockRepository.delete).toHaveBeenCalledWith('already-deleted-session');
    expect(mockCache.invalidate).toHaveBeenCalledWith('already-deleted-session');
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('should propagate repository errors', async () => {
    // Arrange
    mockRepository.delete.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();
    const command = new DeleteSessionCommand('session-123', 'user-456');

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    expect(mockCache.invalidate).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should still succeed if cache invalidation fails (logs warning)', async () => {
    // Arrange - DB succeeds but cache fails
    mockRepository.delete.mockResolvedValue(true);
    mockCache.invalidate.mockRejectedValue(new Error('Redis unavailable'));

    const handler = createHandler();
    const command = new DeleteSessionCommand('session-123', 'user-456');

    // Act
    await handler.execute(command);

    // Assert - should succeed despite cache failure
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-123' }),
      expect.stringContaining('Failed to invalidate')
    );
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
  });
});
