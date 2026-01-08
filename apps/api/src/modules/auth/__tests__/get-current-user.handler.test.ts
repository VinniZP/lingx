/**
 * GetCurrentUserHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../../../services/auth.service.js';
import { GetCurrentUserHandler } from '../queries/get-current-user.handler.js';
import { GetCurrentUserQuery } from '../queries/get-current-user.query.js';

describe('GetCurrentUserHandler', () => {
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

  let mockAuthService: { getUserById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthService = { getUserById: vi.fn() };
  });

  const createHandler = () => new GetCurrentUserHandler(mockAuthService as unknown as AuthService);

  it('should return user by ID', async () => {
    // Arrange
    mockAuthService.getUserById.mockResolvedValue(mockUser);

    const handler = createHandler();

    // Act
    const result = await handler.execute(new GetCurrentUserQuery('user-123'));

    // Assert
    expect(mockAuthService.getUserById).toHaveBeenCalledWith('user-123');
    expect(result).toEqual(mockUser);
  });

  it('should throw NotFoundError when user not found', async () => {
    // Arrange
    mockAuthService.getUserById.mockResolvedValue(null);

    const handler = createHandler();

    // Act & Assert
    await expect(handler.execute(new GetCurrentUserQuery('invalid-user'))).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });
  });

  it('should propagate errors from authService', async () => {
    // Arrange
    mockAuthService.getUserById.mockRejectedValue(new Error('Database unavailable'));

    const handler = createHandler();

    // Act & Assert
    await expect(handler.execute(new GetCurrentUserQuery('user-123'))).rejects.toThrow(
      'Database unavailable'
    );
  });
});
