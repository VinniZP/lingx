import { beforeEach, describe, expect, it } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { UpdateProfileCommand } from '../commands/update-profile.command.js';
import { UpdateProfileHandler } from '../commands/update-profile.handler.js';
import { ProfileUpdatedEvent } from '../events/profile-updated.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import {
  createMockEventBus,
  createMockRepository,
  createMockUser,
  createMockUserWithVerifications,
  type MockEventBus,
  type MockRepository,
} from './test-utils.js';

describe('UpdateProfileHandler', () => {
  let handler: UpdateProfileHandler;
  let mockRepo: MockRepository;
  let mockEventBus: MockEventBus;

  const mockUser = createMockUser();
  const mockUserWithVerifications = createMockUserWithVerifications();

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new UpdateProfileHandler(
      mockRepo as unknown as ProfileRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should update user name and emit ProfileUpdatedEvent', async () => {
      // Arrange
      const command = new UpdateProfileCommand('user-1', { name: 'New Name' });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.updateProfile.mockResolvedValue({
        ...mockUserWithVerifications,
        name: 'New Name',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.name).toBe('New Name');
      expect(mockRepo.findByIdSimple).toHaveBeenCalledWith('user-1');
      expect(mockRepo.updateProfile).toHaveBeenCalledWith('user-1', { name: 'New Name' });
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({ name: 'New Name' }),
          userId: 'user-1',
          changes: { name: true },
        })
      );
    });

    it('should clear name when empty string is provided', async () => {
      // Arrange
      const command = new UpdateProfileCommand('user-1', { name: '' });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.updateProfile.mockResolvedValue({
        ...mockUserWithVerifications,
        name: null,
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.name).toBeNull();
      expect(mockRepo.updateProfile).toHaveBeenCalledWith('user-1', { name: null });
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const command = new UpdateProfileCommand('nonexistent-user', { name: 'New Name' });
      mockRepo.findByIdSimple.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
      expect(mockRepo.updateProfile).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit ProfileUpdatedEvent with correct data', async () => {
      // Arrange
      const command = new UpdateProfileCommand('user-1', { name: 'Updated Name' });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.updateProfile.mockResolvedValue({
        ...mockUserWithVerifications,
        name: 'Updated Name',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ProfileUpdatedEvent);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.changes.name).toBe(true);
    });
  });
});
