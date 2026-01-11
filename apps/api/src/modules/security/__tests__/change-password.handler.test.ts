/**
 * ChangePasswordHandler Unit Tests
 */
import type { Session, User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { ChangePasswordCommand } from '../commands/change-password.command.js';
import { ChangePasswordHandler } from '../commands/change-password.handler.js';
import { PasswordChangedEvent } from '../events/password-changed.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';
import type { UserRepository } from '../user.repository.js';
import type { RequestMetadata } from '../utils.js';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import bcrypt from 'bcrypt';

describe('ChangePasswordHandler', () => {
  let mockUserRepository: {
    findByIdWithPassword: ReturnType<typeof vi.fn>;
    updatePasswordAndDeleteSessions: ReturnType<typeof vi.fn>;
  };
  let mockSessionRepository: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockSessionCache: {
    invalidateAllForUser: ReturnType<typeof vi.fn>;
    setValid: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };
  let mockMetadata: RequestMetadata;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-current-password',
    role: 'DEVELOPER',
    avatarUrl: null,
    preferences: null,
    totpEnabled: false,
    totpSecret: null,
    totpSecretIv: null,
    totpEnabledAt: null,
    totpFailedAttempts: 0,
    totpLockedUntil: null,
    passwordlessAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNewSession: Session = {
    id: 'new-session-123',
    userId: 'user-123',
    userAgent: 'Test Browser',
    deviceInfo: 'Unknown Browser on Unknown OS',
    ipAddress: '127.0.0.1',
    lastActive: new Date(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    trustedUntil: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRepository = {
      findByIdWithPassword: vi.fn(),
      updatePasswordAndDeleteSessions: vi.fn(),
    };
    mockSessionRepository = { create: vi.fn() };
    mockSessionCache = {
      invalidateAllForUser: vi.fn(),
      setValid: vi.fn(),
    };
    mockEventBus = { publish: vi.fn() };
    mockMetadata = { userAgent: 'Test Browser', ipAddress: '127.0.0.1' };

    // Default mock implementations
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-new-password');
  });

  const createHandler = () =>
    new ChangePasswordHandler(
      mockUserRepository as unknown as UserRepository,
      mockSessionRepository as unknown as SessionRepository,
      mockSessionCache as unknown as SessionCacheService,
      mockEventBus as unknown as IEventBus
    );

  it('should change password and publish PasswordChangedEvent', async () => {
    // Arrange
    mockUserRepository.findByIdWithPassword.mockResolvedValue(mockUser);
    mockUserRepository.updatePasswordAndDeleteSessions.mockResolvedValue(undefined);
    mockSessionRepository.create.mockResolvedValue(mockNewSession);

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
    expect(mockUserRepository.findByIdWithPassword).toHaveBeenCalledWith('user-123');
    expect(bcrypt.compare).toHaveBeenCalledWith('currentPassword123', 'hashed-current-password');
    expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 12);
    expect(mockUserRepository.updatePasswordAndDeleteSessions).toHaveBeenCalledWith(
      'user-123',
      'hashed-new-password'
    );
    expect(mockSessionCache.invalidateAllForUser).toHaveBeenCalledWith('user-123');
    expect(mockSessionRepository.create).toHaveBeenCalled();
    expect(mockSessionCache.setValid).toHaveBeenCalledWith('new-session-123', 'user-123');

    expect(result).toEqual({ newSessionId: 'new-session-123' });

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as PasswordChangedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.newSessionId).toBe('new-session-123');
  });

  it('should throw UnauthorizedError when user not found', async () => {
    // Arrange
    mockUserRepository.findByIdWithPassword.mockResolvedValue(null);

    const handler = createHandler();
    const command = new ChangePasswordCommand(
      'nonexistent-user',
      'session-123',
      'password',
      'newPassword',
      mockMetadata
    );

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('User not found');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError when user is passwordless', async () => {
    // Arrange
    mockUserRepository.findByIdWithPassword.mockResolvedValue({ ...mockUser, password: null });

    const handler = createHandler();
    const command = new ChangePasswordCommand(
      'user-123',
      'session-123',
      'password',
      'newPassword',
      mockMetadata
    );

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(
      'You are passwordless and cannot change your password'
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw FieldValidationError when current password is incorrect', async () => {
    // Arrange
    mockUserRepository.findByIdWithPassword.mockResolvedValue(mockUser);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

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
