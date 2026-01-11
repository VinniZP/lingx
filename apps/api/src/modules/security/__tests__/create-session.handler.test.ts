/**
 * CreateSessionHandler Unit Tests
 */
import type { Session } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { CreateSessionCommand } from '../commands/create-session.command.js';
import { CreateSessionHandler } from '../commands/create-session.handler.js';
import { SessionCreatedEvent } from '../events/session-created.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';

describe('CreateSessionHandler', () => {
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockCache: {
    setValid: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    warn: ReturnType<typeof vi.fn>;
  };

  const CHROME_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const mockSession: Session = {
    id: 'session-123',
    userId: 'user-456',
    userAgent: CHROME_USER_AGENT,
    deviceInfo: 'Chrome on macOS',
    ipAddress: '192.168.1.1',
    lastActive: new Date(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    trustedUntil: null,
  };

  beforeEach(() => {
    mockRepository = { create: vi.fn() };
    mockCache = { setValid: vi.fn() };
    mockEventBus = { publish: vi.fn() };
    mockLogger = { warn: vi.fn() };
  });

  const createHandler = () =>
    new CreateSessionHandler(
      mockRepository as unknown as SessionRepository,
      mockCache as unknown as SessionCacheService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );

  it('should create session, cache it, and publish SessionCreatedEvent', async () => {
    // Arrange
    mockRepository.create.mockResolvedValue(mockSession);
    mockCache.setValid.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new CreateSessionCommand('user-456', CHROME_USER_AGENT, '192.168.1.1');

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result).toEqual(mockSession);

    // Verify repository call with parsed device info
    expect(mockRepository.create).toHaveBeenCalledWith({
      userId: 'user-456',
      userAgent: CHROME_USER_AGENT,
      deviceInfo: 'Chrome on macOS',
      ipAddress: '192.168.1.1',
    });

    // Verify cache call
    expect(mockCache.setValid).toHaveBeenCalledWith('session-123', 'user-456');

    // Verify event published
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as SessionCreatedEvent;
    expect(publishedEvent).toBeInstanceOf(SessionCreatedEvent);
    expect(publishedEvent.sessionId).toBe('session-123');
    expect(publishedEvent.userId).toBe('user-456');
    expect(publishedEvent.deviceInfo).toBe('Chrome on macOS');
    expect(publishedEvent.ipAddress).toBe('192.168.1.1');
  });

  it('should handle null userAgent gracefully', async () => {
    // Arrange
    const sessionWithoutAgent = { ...mockSession, userAgent: null, deviceInfo: null };
    mockRepository.create.mockResolvedValue(sessionWithoutAgent);

    const handler = createHandler();
    const command = new CreateSessionCommand('user-456', null, '192.168.1.1');

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.deviceInfo).toBeNull();
    expect(mockRepository.create).toHaveBeenCalledWith({
      userId: 'user-456',
      userAgent: null,
      deviceInfo: null,
      ipAddress: '192.168.1.1',
    });
  });

  it('should propagate repository errors', async () => {
    // Arrange
    mockRepository.create.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();
    const command = new CreateSessionCommand('user-456', null, null);

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    expect(mockCache.setValid).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should still succeed if cache fails (logs warning)', async () => {
    // Arrange - DB succeeds but cache fails
    mockRepository.create.mockResolvedValue(mockSession);
    mockCache.setValid.mockRejectedValue(new Error('Redis unavailable'));

    const handler = createHandler();
    const command = new CreateSessionCommand('user-456', null, null);

    // Act
    const result = await handler.execute(command);

    // Assert - should succeed despite cache failure
    expect(result).toEqual(mockSession);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-123' }),
      expect.stringContaining('Failed to cache')
    );
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
  });
});
