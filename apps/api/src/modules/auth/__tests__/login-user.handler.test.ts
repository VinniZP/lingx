/**
 * LoginUserHandler Unit Tests
 *
 * TDD: Tests written BEFORE implementation.
 * Covers: normal login, 2FA required, invalid credentials
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../../plugins/error-handler.js';
import type { AuthService } from '../../../services/auth.service.js';
import type { ICommandBus, IEventBus } from '../../../shared/cqrs/index.js';
import { CreateSessionCommand } from '../../security/commands/create-session.command.js';
import { LoginUserCommand } from '../commands/login-user.command.js';
import { LoginUserHandler } from '../commands/login-user.handler.js';
import { UserLoggedInEvent } from '../events/user-logged-in.event.js';

describe('LoginUserHandler', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    totpEnabled: false,
    totpSecret: null,
    totpIv: null,
    totpFailedAttempts: 0,
    totpLockedUntil: null,
  };

  const mockUserWith2FA = {
    ...mockUser,
    totpEnabled: true,
  };

  const mockSession = {
    id: 'session-456',
    userId: 'user-123',
    userAgent: 'test-agent',
    deviceInfo: 'Test Browser',
    ipAddress: '127.0.0.1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    lastActive: new Date(),
    createdAt: new Date(),
    trustedUntil: null,
  };

  const mockRequest = {
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
  };

  let mockAuthService: { login: ReturnType<typeof vi.fn> };
  let mockCommandBus: { execute: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthService = { login: vi.fn() };
    mockCommandBus = { execute: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new LoginUserHandler(
      mockAuthService as unknown as AuthService,
      mockCommandBus as unknown as ICommandBus,
      mockEventBus as unknown as IEventBus
    );

  const createCommand = (email: string, password: string, isDeviceTrusted: boolean) =>
    new LoginUserCommand(
      email,
      password,
      mockRequest as unknown as LoginUserCommand['request'],
      isDeviceTrusted
    );

  it('should login user without 2FA and publish UserLoggedInEvent', async () => {
    // Arrange
    mockAuthService.login.mockResolvedValue(mockUser);
    mockCommandBus.execute.mockResolvedValue(mockSession);

    const handler = createHandler();

    // Act
    const result = await handler.execute(createCommand('test@example.com', 'Password123!', false));

    // Assert
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    const executedCommand = mockCommandBus.execute.mock.calls[0][0] as CreateSessionCommand;
    expect(executedCommand).toBeInstanceOf(CreateSessionCommand);
    expect(executedCommand.userId).toBe(mockUser.id);
    expect(executedCommand.userAgent).toBe('test-agent');
    expect(executedCommand.ipAddress).toBe('127.0.0.1');

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserLoggedInEvent));

    // Verify event data
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserLoggedInEvent;
    expect(publishedEvent.userId).toBe(mockUser.id);
    expect(publishedEvent.sessionId).toBe(mockSession.id);

    // Result should contain user and sessionId (not 2FA)
    expect(result).toEqual({
      user: mockUser,
      sessionId: mockSession.id,
    });
    expect('requiresTwoFactor' in result).toBe(false);
  });

  it('should return 2FA required when user has TOTP enabled and device not trusted', async () => {
    // Arrange
    mockAuthService.login.mockResolvedValue(mockUserWith2FA);

    const handler = createHandler();

    // Act
    const result = await handler.execute(createCommand('test@example.com', 'Password123!', false));

    // Assert - should NOT create session or publish event
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();

    // Result should indicate 2FA required with userId (route generates tempToken)
    expect(result).toMatchObject({
      requiresTwoFactor: true,
      userId: mockUserWith2FA.id,
    });
  });

  it('should login user with 2FA when device is trusted', async () => {
    // Arrange
    mockAuthService.login.mockResolvedValue(mockUserWith2FA);
    mockCommandBus.execute.mockResolvedValue(mockSession);

    const handler = createHandler();

    // Act - isDeviceTrusted = true
    const result = await handler.execute(createCommand('test@example.com', 'Password123!', true));

    // Assert - should proceed with normal login
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    const executedCommand = mockCommandBus.execute.mock.calls[0][0] as CreateSessionCommand;
    expect(executedCommand.userId).toBe(mockUserWith2FA.id);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserLoggedInEvent));

    expect(result).toEqual({
      user: mockUserWith2FA,
      sessionId: mockSession.id,
    });
  });

  it('should propagate UnauthorizedError for invalid credentials', async () => {
    // Arrange
    mockAuthService.login.mockRejectedValue(new UnauthorizedError('Invalid email or password'));

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(createCommand('wrong@example.com', 'WrongPass!', false))
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    });

    // Session and event should NOT be created
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate errors when session creation fails', async () => {
    // Arrange
    mockAuthService.login.mockResolvedValue(mockUser);
    mockCommandBus.execute.mockRejectedValue(new Error('Database error'));

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(createCommand('test@example.com', 'Password123!', false))
    ).rejects.toThrow('Database error');

    // Event should NOT be published on failure
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
