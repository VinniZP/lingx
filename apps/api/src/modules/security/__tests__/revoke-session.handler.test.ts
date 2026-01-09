/**
 * RevokeSessionHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SecurityService } from '../../../services/security.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { RevokeSessionCommand } from '../commands/revoke-session.command.js';
import { RevokeSessionHandler } from '../commands/revoke-session.handler.js';
import { SessionRevokedEvent } from '../events/session-revoked.event.js';

describe('RevokeSessionHandler', () => {
  let mockSecurityService: { revokeSession: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSecurityService = { revokeSession: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new RevokeSessionHandler(
      mockSecurityService as unknown as SecurityService,
      mockEventBus as unknown as IEventBus
    );

  it('should revoke session and publish SessionRevokedEvent', async () => {
    // Arrange
    mockSecurityService.revokeSession.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new RevokeSessionCommand(
      'user-123',
      'target-session-456',
      'current-session-123'
    );

    // Act
    await handler.execute(command);

    // Assert
    expect(mockSecurityService.revokeSession).toHaveBeenCalledWith(
      'user-123',
      'target-session-456',
      'current-session-123'
    );

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(SessionRevokedEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as SessionRevokedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.revokedSessionId).toBe('target-session-456');
  });

  it('should propagate errors when trying to revoke current session', async () => {
    // Arrange
    mockSecurityService.revokeSession.mockRejectedValue(
      new Error('Cannot revoke current session. Use logout instead.')
    );

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
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate errors when session not found', async () => {
    // Arrange
    mockSecurityService.revokeSession.mockRejectedValue(new Error('Session not found'));

    const handler = createHandler();
    const command = new RevokeSessionCommand('user-123', 'invalid-session', 'current-session-123');

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Session not found');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
