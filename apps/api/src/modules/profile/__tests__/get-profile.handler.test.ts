import { beforeEach, describe, expect, it } from 'vitest';
import { GetProfileHandler } from '../queries/get-profile.handler.js';
import { GetProfileQuery } from '../queries/get-profile.query.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import { DEFAULT_PREFERENCES } from '../types.js';
import {
  createMockRepository,
  createMockUserWithVerifications,
  type MockRepository,
} from './test-utils.js';

describe('GetProfileHandler', () => {
  let handler: GetProfileHandler;
  let mockRepo: MockRepository;

  const mockUser = createMockUserWithVerifications({
    avatarUrl: 'http://example.com/avatar.jpg',
    preferences: {
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        inApp: true,
        digestFrequency: 'weekly',
      },
      defaultProjectId: null,
    },
  });

  beforeEach(() => {
    mockRepo = createMockRepository();
    handler = new GetProfileHandler(mockRepo as unknown as ProfileRepository);
  });

  describe('Happy Path', () => {
    it('should return user profile with preferences', async () => {
      // Arrange
      const query = new GetProfileQuery('user-1');
      mockRepo.findById.mockResolvedValue(mockUser);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toMatchObject({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        avatarUrl: 'http://example.com/avatar.jpg',
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: {
            email: true,
            inApp: true,
            digestFrequency: 'weekly',
          },
          defaultProjectId: null,
        },
        pendingEmailChange: null,
      });
      expect(mockRepo.findById).toHaveBeenCalledWith('user-1');
    });

    it('should return default preferences for user without preferences', async () => {
      // Arrange
      const query = new GetProfileQuery('user-1');
      mockRepo.findById.mockResolvedValue({
        ...mockUser,
        preferences: null,
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
    });

    it('should include pending email change if exists', async () => {
      // Arrange
      const query = new GetProfileQuery('user-1');
      mockRepo.findById.mockResolvedValue({
        ...mockUser,
        emailVerifications: [
          {
            id: 'verification-1',
            userId: 'user-1',
            newEmail: 'newemail@example.com',
            token: 'token-123',
            expiresAt: new Date(Date.now() + 86400000),
            createdAt: new Date(),
          },
        ],
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.pendingEmailChange).toBe('newemail@example.com');
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const query = new GetProfileQuery('nonexistent-user');
      mockRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('User not found');
    });
  });
});
