/**
 * RevokeSessionHandler Unit Tests
 */
import type { Session } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { RevokeSessionCommand } from '../commands/revoke-session.command.js';
import { RevokeSessionHandler } from '../commands/revoke-session.handler.js';
import { SessionRevokedEvent } from '../events/session-revoked.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';

describe('RevokeSessionHandler', () => {
  let mockRepository: {
    findByIdAndUserId: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockCache: {
    invalidate: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  const mockSession: Session = {
    id: 'target-session-456',
    userId: 'user-123',
    userAgent: null,
    deviceInfo: null,
    ipAddress: null,
    lastActive: new Date(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    trustedUntil: null,
  };

  beforeEach(() => {
    mockRepository = {
      findByIdAndUserId: vi.fn(),
      delete: vi.fn(),
    };
    mockCache = { invalidate: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new RevokeSessionHandler(
      mockRepository as unknown as SessionRepository,
      mockCache as unknown as SessionCacheService,
      mockEventBus as unknown as IEventBus
    );

  it('should revoke session, invalidate cache, and publish SessionRevokedEvent', async () => {
    // Arrange
    mockRepository.findByIdAndUserId.mockResolvedValue(mockSession);
    mockRepository.delete.mockResolvedValue(true);

    const handler = createHandler();
    const command = new RevokeSessionCommand(
      'user-123',
      'target-session-456',
      'current-session-123'
    );

    // Act
    await handler.execute(command);

    // Assert
    expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith('target-session-456', 'user-123');
    expect(mockRepository.delete).toHaveBeenCalledWith('target-session-456');
    expect(mockCache.invalidate).toHaveBeenCalledWith('target-session-456');

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(SessionRevokedEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as SessionRevokedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.revokedSessionId).toBe('target-session-456');
  });

  it('should throw error when trying to revoke current session', async () => {
    // Arrange
    const handler = createHandler();
    const command = new RevokeSessionCommand(
      'user-123',
      'current-session-123',
      'current-session-123'
    );

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(
      'Cannot revoke current session. Use logout instead.'
    );
    expect(mockRepository.findByIdAndUserId).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw error when session not found', async () => {
    // Arrange
    mockRepository.findByIdAndUserId.mockResolvedValue(null);

    const handler = createHandler();
    const command = new RevokeSessionCommand('user-123', 'invalid-session', 'current-session-123');

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Session not found');
    expect(mockRepository.delete).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
