/**
 * ChangePasswordHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestMetadata, SecurityService } from '../../../services/security.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { ChangePasswordCommand } from '../commands/change-password.command.js';
import { ChangePasswordHandler } from '../commands/change-password.handler.js';
import { PasswordChangedEvent } from '../events/password-changed.event.js';

describe('ChangePasswordHandler', () => {
  let mockSecurityService: { changePassword: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };
  let mockMetadata: RequestMetadata;

  beforeEach(() => {
    mockSecurityService = { changePassword: vi.fn() };
    mockEventBus = { publish: vi.fn() };
    mockMetadata = { userAgent: 'Test Browser', ipAddress: '127.0.0.1' };
  });

  const createHandler = () =>
    new ChangePasswordHandler(
      mockSecurityService as unknown as SecurityService,
      mockEventBus as unknown as IEventBus
    );

  it('should change password and publish PasswordChangedEvent', async () => {
    // Arrange
    mockSecurityService.changePassword.mockResolvedValue({ newSessionId: 'new-session-123' });

    const handler = createHandler();
    const command = new ChangePasswordCommand(
      'user-123',
      'session-123',
      'currentPassword123',
      'newPassword456',
      mockMetadata
    );

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(mockSecurityService.changePassword).toHaveBeenCalledWith(
      'user-123',
      'session-123',
      { currentPassword: 'currentPassword123', newPassword: 'newPassword456' },
      mockMetadata
    );
    expect(result).toEqual({ newSessionId: 'new-session-123' });

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(PasswordChangedEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as PasswordChangedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.newSessionId).toBe('new-session-123');
  });

  it('should propagate errors and not publish event on failure', async () => {
    // Arrange
    mockSecurityService.changePassword.mockRejectedValue(new Error('Invalid current password'));

    const handler = createHandler();
    const command = new ChangePasswordCommand(
      'user-123',
      'session-123',
      'wrongPassword',
      'newPassword456',
      mockMetadata
    );

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Invalid current password');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
