/**
 * RegisterUserHandler Unit Tests
 *
 * TDD: Tests written BEFORE implementation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldValidationError } from '../../../plugins/error-handler.js';
import type { AuthService } from '../../../services/auth.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { RegisterUserCommand } from '../commands/register-user.command.js';
import { RegisterUserHandler } from '../commands/register-user.handler.js';
import { UserRegisteredEvent } from '../events/user-registered.event.js';

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

  let mockAuthService: { register: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthService = { register: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new RegisterUserHandler(
      mockAuthService as unknown as AuthService,
      mockEventBus as unknown as IEventBus
    );

  it('should register user via authService and publish UserRegisteredEvent', async () => {
    // Arrange
    mockAuthService.register.mockResolvedValue(mockUser);

    const handler = createHandler();

    // Act
    const result = await handler.execute(
      new RegisterUserCommand('test@example.com', 'Password123!', 'Test User')
    );

    // Assert
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    });
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
    mockAuthService.register.mockResolvedValue(userWithoutName);

    const handler = createHandler();

    // Act
    const result = await handler.execute(
      new RegisterUserCommand('test@example.com', 'Password123!')
    );

    // Assert
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
      name: undefined,
    });
    expect(result).toEqual(userWithoutName);
  });

  it('should propagate FieldValidationError for duplicate email', async () => {
    // Arrange
    const fieldError = new FieldValidationError(
      [{ field: 'email', message: 'Email exists', code: 'USER_EMAIL_UNIQUE' }],
      'Email already registered'
    );
    mockAuthService.register.mockRejectedValue(fieldError);

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(new RegisterUserCommand('dup@example.com', 'Pass123!'))
    ).rejects.toMatchObject({
      message: 'Email already registered',
      code: 'FIELD_VALIDATION_ERROR',
      statusCode: 409,
    });

    // Event should NOT be published on failure
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate any other errors without publishing event', async () => {
    // Arrange
    mockAuthService.register.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(new RegisterUserCommand('test@example.com', 'Pass123!'))
    ).rejects.toThrow('Database connection failed');

    // Event should NOT be published on failure
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
