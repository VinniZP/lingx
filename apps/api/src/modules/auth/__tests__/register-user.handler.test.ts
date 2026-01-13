/**
 * RegisterUserHandler Unit Tests
 *
 * Tests that the handler correctly orchestrates:
 * - Email uniqueness check via repository
 * - Password hashing
 * - User creation via repository
 * - Event publication
 */
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { RegisterUserCommand } from '../commands/register-user.command.js';
import { RegisterUserHandler } from '../commands/register-user.handler.js';
import { UserRegisteredEvent } from '../events/user-registered.event.js';
import type { AuthRepository } from '../repositories/auth.repository.js';

// Mock bcrypt to control password hashing in tests
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe('RegisterUserHandler', () => {
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

  let mockAuthRepository: {
    emailExists: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthRepository = {
      emailExists: vi.fn(),
      create: vi.fn(),
    };
    mockEventBus = { publish: vi.fn() };
    vi.mocked(bcrypt.hash).mockReset();
  });

  const createHandler = () =>
    new RegisterUserHandler(
      mockAuthRepository as unknown as AuthRepository,
      mockEventBus as unknown as IEventBus
    );

  it('should check email uniqueness, hash password, create user, and publish event', async () => {
    // Arrange
    mockAuthRepository.emailExists.mockResolvedValue(false);
    mockAuthRepository.create.mockResolvedValue(mockUser);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);

    const handler = createHandler();

    // Act
    const result = await handler.execute(
      new RegisterUserCommand('test@example.com', 'Password123!', 'Test User')
    );

    // Assert - email check
    expect(mockAuthRepository.emailExists).toHaveBeenCalledWith('test@example.com');

    // Assert - password hashing with bcrypt rounds = 12
    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);

    // Assert - user creation with hashed password
    expect(mockAuthRepository.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'hashed_password',
      name: 'Test User',
    });

    // Assert - event published
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserRegisteredEvent));

    // Verify event contains correct user data
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserRegisteredEvent;
    expect(publishedEvent.user).toEqual(mockUser);
    expect(publishedEvent.occurredAt).toBeInstanceOf(Date);

    expect(result).toEqual(mockUser);
  });

  it('should register user without name when not provided', async () => {
    // Arrange
    const userWithoutName = { ...mockUser, name: null };
    mockAuthRepository.emailExists.mockResolvedValue(false);
    mockAuthRepository.create.mockResolvedValue(userWithoutName);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);

    const handler = createHandler();

    // Act
    const result = await handler.execute(
      new RegisterUserCommand('test@example.com', 'Password123!')
    );

    // Assert
    expect(mockAuthRepository.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'hashed_password',
      name: undefined,
    });
    expect(result).toEqual(userWithoutName);
  });

  it('should throw FieldValidationError for duplicate email without creating user', async () => {
    // Arrange
    mockAuthRepository.emailExists.mockResolvedValue(true);

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(new RegisterUserCommand('dup@example.com', 'Pass123!'))
    ).rejects.toMatchObject({
      message: 'Email already registered',
      code: 'FIELD_VALIDATION_ERROR',
      statusCode: 409,
    });

    // Should NOT hash password or create user
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(mockAuthRepository.create).not.toHaveBeenCalled();

    // Event should NOT be published on failure
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate repository errors without publishing event', async () => {
    // Arrange
    mockAuthRepository.emailExists.mockResolvedValue(false);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);
    mockAuthRepository.create.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(new RegisterUserCommand('test@example.com', 'Pass123!'))
    ).rejects.toThrow('Database connection failed');

    // Event should NOT be published on failure
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
