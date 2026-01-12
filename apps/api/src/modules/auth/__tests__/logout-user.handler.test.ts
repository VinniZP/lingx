/**
 * LogoutUserHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommandBus, IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteSessionCommand } from '../../security/commands/delete-session.command.js';
import { LogoutUserCommand } from '../commands/logout-user.command.js';
import { LogoutUserHandler } from '../commands/logout-user.handler.js';
import { UserLoggedOutEvent } from '../events/user-logged-out.event.js';

describe('LogoutUserHandler', () => {
  let mockCommandBus: { execute: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCommandBus = { execute: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new LogoutUserHandler(
      mockCommandBus as unknown as ICommandBus,
      mockEventBus as unknown as IEventBus
    );

  it('should delete session and publish UserLoggedOutEvent when sessionId provided', async () => {
    // Arrange
    mockCommandBus.execute.mockResolvedValue(undefined);

    const handler = createHandler();

    // Act
    await handler.execute(new LogoutUserCommand('user-456', 'session-123'));

    // Assert
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    const executedCommand = mockCommandBus.execute.mock.calls[0][0] as DeleteSessionCommand;
    expect(executedCommand).toBeInstanceOf(DeleteSessionCommand);
    expect(executedCommand.sessionId).toBe('session-123');
    expect(executedCommand.userId).toBe('user-456');

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserLoggedOutEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserLoggedOutEvent;
    expect(publishedEvent.sessionId).toBe('session-123');
  });

  it('should not call deleteSession when sessionId is undefined', async () => {
    // Arrange
    const handler = createHandler();

    // Act
    await handler.execute(new LogoutUserCommand('user-456', undefined));

    // Assert
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

    // Verify event data contains undefined sessionId
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserLoggedOutEvent;
    expect(publishedEvent.sessionId).toBeUndefined();
  });

  it('should propagate unexpected errors from deleteSession', async () => {
    // Arrange - unexpected database error (not P2025)
    mockCommandBus.execute.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();

    // Act & Assert - should propagate the error
    await expect(handler.execute(new LogoutUserCommand('user-456', 'session-123'))).rejects.toThrow(
      'Database connection failed'
    );

    // Event should NOT be published on failure
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
