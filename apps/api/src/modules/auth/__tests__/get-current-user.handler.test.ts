/**
 * GetCurrentUserHandler Unit Tests
 *
 * Tests that the handler correctly retrieves user via repository.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetCurrentUserHandler } from '../queries/get-current-user.handler.js';
import { GetCurrentUserQuery } from '../queries/get-current-user.query.js';
import type { AuthRepository } from '../repositories/auth.repository.js';

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

  let mockAuthRepository: { findById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthRepository = { findById: vi.fn() };
  });

  const createHandler = () =>
    new GetCurrentUserHandler(mockAuthRepository as unknown as AuthRepository);

  it('should return user by ID', async () => {
    // Arrange
    mockAuthRepository.findById.mockResolvedValue(mockUser);

    const handler = createHandler();

    // Act
    const result = await handler.execute(new GetCurrentUserQuery('user-123'));

    // Assert
    expect(mockAuthRepository.findById).toHaveBeenCalledWith('user-123');
    expect(result).toEqual(mockUser);
  });

  it('should throw NotFoundError when user not found', async () => {
    // Arrange
    mockAuthRepository.findById.mockResolvedValue(null);

    const handler = createHandler();

    // Act & Assert
    await expect(handler.execute(new GetCurrentUserQuery('invalid-user'))).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });
  });

  it('should propagate errors from repository', async () => {
    // Arrange
    mockAuthRepository.findById.mockRejectedValue(new Error('Database unavailable'));

    const handler = createHandler();

    // Act & Assert
    await expect(handler.execute(new GetCurrentUserQuery('user-123'))).rejects.toThrow(
      'Database unavailable'
    );
  });
});
