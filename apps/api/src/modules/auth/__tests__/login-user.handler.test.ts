/**
 * LoginUserHandler Unit Tests
 *
 * Tests that the handler correctly orchestrates:
 * - User lookup via repository
 * - Password verification
 * - 2FA check
 * - Session creation
 * - Event publication
 */
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommandBus, IEventBus } from '../../../shared/cqrs/index.js';
import { CreateSessionCommand } from '../../security/commands/create-session.command.js';
import { LoginUserCommand } from '../commands/login-user.command.js';
import { LoginUserHandler } from '../commands/login-user.handler.js';
import { UserLoggedInEvent } from '../events/user-logged-in.event.js';
import type { AuthRepository } from '../repositories/auth.repository.js';

// Mock bcrypt to control password verification in tests
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('LoginUserHandler', () => {
  const mockUserWithPassword = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    totpEnabled: false,
    totpSecret: null,
    totpIv: null,
    totpFailedAttempts: 0,
    totpLockedUntil: null,
  };

  const mockUserWithoutPassword = {
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
    ...mockUserWithPassword,
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

  let mockAuthRepository: { findByEmailWithPassword: ReturnType<typeof vi.fn> };
  let mockCommandBus: { execute: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthRepository = { findByEmailWithPassword: vi.fn() };
    mockCommandBus = { execute: vi.fn() };
    mockEventBus = { publish: vi.fn() };
    vi.mocked(bcrypt.compare).mockReset();
  });

  const createHandler = () =>
    new LoginUserHandler(
      mockAuthRepository as unknown as AuthRepository,
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
    mockAuthRepository.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    mockCommandBus.execute.mockResolvedValue(mockSession);

    const handler = createHandler();

    // Act
    const result = await handler.execute(createCommand('test@example.com', 'Password123!', false));

    // Assert - repository called
    expect(mockAuthRepository.findByEmailWithPassword).toHaveBeenCalledWith('test@example.com');

    // Assert - password verified
    expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashed_password');

    // Assert - session created
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    const executedCommand = mockCommandBus.execute.mock.calls[0][0] as CreateSessionCommand;
    expect(executedCommand).toBeInstanceOf(CreateSessionCommand);
    expect(executedCommand.userId).toBe(mockUserWithPassword.id);
    expect(executedCommand.userAgent).toBe('test-agent');
    expect(executedCommand.ipAddress).toBe('127.0.0.1');

    // Assert - event published
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserLoggedInEvent));

    // Verify event data
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserLoggedInEvent;
    expect(publishedEvent.userId).toBe(mockUserWithPassword.id);
    expect(publishedEvent.sessionId).toBe(mockSession.id);

    // Result should contain user without password and sessionId
    expect(result).toEqual({
      user: mockUserWithoutPassword,
      sessionId: mockSession.id,
    });
    expect('requiresTwoFactor' in result).toBe(false);
  });

  it('should return 2FA required when user has TOTP enabled and device not trusted', async () => {
    // Arrange
    mockAuthRepository.findByEmailWithPassword.mockResolvedValue(mockUserWith2FA);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

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
    mockAuthRepository.findByEmailWithPassword.mockResolvedValue(mockUserWith2FA);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    mockCommandBus.execute.mockResolvedValue(mockSession);

    const handler = createHandler();

    // Act - isDeviceTrusted = true
    const result = await handler.execute(createCommand('test@example.com', 'Password123!', true));

    // Assert - should proceed with normal login
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    const executedCommand = mockCommandBus.execute.mock.calls[0][0] as CreateSessionCommand;
    expect(executedCommand.userId).toBe(mockUserWith2FA.id);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserLoggedInEvent));

    // Result should contain user without password
    expect(result).toMatchObject({
      sessionId: mockSession.id,
    });
    expect((result as { user: { password?: string } }).user.password).toBeUndefined();
  });

  it('should throw UnauthorizedError when user not found', async () => {
    // Arrange
    mockAuthRepository.findByEmailWithPassword.mockResolvedValue(null);

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(createCommand('wrong@example.com', 'WrongPass!', false))
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    });

    // Password check should NOT be called
    expect(bcrypt.compare).not.toHaveBeenCalled();

    // Session and event should NOT be created
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError for invalid password', async () => {
    // Arrange
    mockAuthRepository.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(createCommand('test@example.com', 'WrongPass!', false))
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    });

    // Session and event should NOT be created
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError for passwordless user', async () => {
    // Arrange
    const passwordlessUser = { ...mockUserWithPassword, password: null };
    mockAuthRepository.findByEmailWithPassword.mockResolvedValue(passwordlessUser);

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(createCommand('test@example.com', 'Password123!', false))
    ).rejects.toMatchObject({
      message: 'Please sign in with your passkey',
      statusCode: 401,
    });

    // Password check should NOT be called
    expect(bcrypt.compare).not.toHaveBeenCalled();

    // Session and event should NOT be created
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate errors when session creation fails', async () => {
    // Arrange
    mockAuthRepository.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
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
