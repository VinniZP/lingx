/**
 * RevokeAllSessionsHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SecurityService } from '../../../services/security.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { RevokeAllSessionsCommand } from '../commands/revoke-all-sessions.command.js';
import { RevokeAllSessionsHandler } from '../commands/revoke-all-sessions.handler.js';
import { AllSessionsRevokedEvent } from '../events/all-sessions-revoked.event.js';

describe('RevokeAllSessionsHandler', () => {
  let mockSecurityService: { revokeAllOtherSessions: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSecurityService = { revokeAllOtherSessions: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new RevokeAllSessionsHandler(
      mockSecurityService as unknown as SecurityService,
      mockEventBus as unknown as IEventBus
    );

  it('should revoke all sessions and publish AllSessionsRevokedEvent', async () => {
    // Arrange
    mockSecurityService.revokeAllOtherSessions.mockResolvedValue(3);

    const handler = createHandler();
    const command = new RevokeAllSessionsCommand('user-123', 'current-session-123');

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(mockSecurityService.revokeAllOtherSessions).toHaveBeenCalledWith(
      'user-123',
      'current-session-123'
    );
    expect(result).toEqual({ revokedCount: 3 });

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(AllSessionsRevokedEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as AllSessionsRevokedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.revokedCount).toBe(3);
    expect(publishedEvent.currentSessionId).toBe('current-session-123');
  });

  it('should handle zero sessions revoked', async () => {
    // Arrange
    mockSecurityService.revokeAllOtherSessions.mockResolvedValue(0);

    const handler = createHandler();
    const command = new RevokeAllSessionsCommand('user-123', 'current-session-123');

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result).toEqual({ revokedCount: 0 });
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as AllSessionsRevokedEvent;
    expect(publishedEvent.revokedCount).toBe(0);
  });

  it('should propagate errors and not publish event on failure', async () => {
    // Arrange
    mockSecurityService.revokeAllOtherSessions.mockRejectedValue(new Error('Database error'));

    const handler = createHandler();
    const command = new RevokeAllSessionsCommand('user-123', 'current-session-123');

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Database error');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
