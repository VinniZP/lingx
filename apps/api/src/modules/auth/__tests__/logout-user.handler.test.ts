/**
 * LogoutUserHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogoutUserCommand } from '../commands/logout-user.command.js';
import { LogoutUserHandler } from '../commands/logout-user.handler.js';
import { UserLoggedOutEvent } from '../events/user-logged-out.event.js';

describe('LogoutUserHandler', () => {
  let mockSecurityService: { deleteSession: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSecurityService = { deleteSession: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  it('should delete session and publish UserLoggedOutEvent when sessionId provided', async () => {
    // Arrange
    mockSecurityService.deleteSession.mockResolvedValue(undefined);

    const handler = new LogoutUserHandler(mockSecurityService as never, mockEventBus as never);

    // Act
    await handler.execute(new LogoutUserCommand('session-123'));

    // Assert
    expect(mockSecurityService.deleteSession).toHaveBeenCalledWith('session-123');
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserLoggedOutEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserLoggedOutEvent;
    expect(publishedEvent.sessionId).toBe('session-123');
  });

  it('should not call deleteSession when sessionId is undefined', async () => {
    // Arrange
    const handler = new LogoutUserHandler(mockSecurityService as never, mockEventBus as never);

    // Act
    await handler.execute(new LogoutUserCommand(undefined));

    // Assert
    expect(mockSecurityService.deleteSession).not.toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

    // Verify event data contains undefined sessionId
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserLoggedOutEvent;
    expect(publishedEvent.sessionId).toBeUndefined();
  });

  it('should propagate unexpected errors from deleteSession', async () => {
    // Arrange - unexpected database error (not P2025)
    mockSecurityService.deleteSession.mockRejectedValue(new Error('Database connection failed'));

    const handler = new LogoutUserHandler(mockSecurityService as never, mockEventBus as never);

    // Act & Assert - should propagate the error
    await expect(handler.execute(new LogoutUserCommand('session-123'))).rejects.toThrow(
      'Database connection failed'
    );

    // Event should NOT be published on failure
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
