import { beforeEach, describe, expect, it } from 'vitest';
import type { FileStorageService } from '../../../services/file-storage.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteAvatarCommand } from '../commands/delete-avatar.command.js';
import { DeleteAvatarHandler } from '../commands/delete-avatar.handler.js';
import { AvatarDeletedEvent } from '../events/avatar-deleted.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import {
  createMockEventBus,
  createMockFileStorage,
  createMockRepository,
  createMockUser,
  type MockEventBus,
  type MockFileStorage,
  type MockRepository,
} from './test-utils.js';

describe('DeleteAvatarHandler', () => {
  let handler: DeleteAvatarHandler;
  let mockRepo: MockRepository;
  let mockFileStorage: MockFileStorage;
  let mockEventBus: MockEventBus;

  const mockUser = createMockUser({
    avatarUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
    preferences: null,
  });

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockFileStorage = createMockFileStorage();
    mockEventBus = createMockEventBus();
    handler = new DeleteAvatarHandler(
      mockRepo as unknown as ProfileRepository,
      mockFileStorage as unknown as FileStorageService,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should delete avatar and emit AvatarDeletedEvent', async () => {
      // Arrange
      const command = new DeleteAvatarCommand('user-1');
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockFileStorage.deleteAvatar.mockResolvedValue(undefined);
      mockRepo.updateAvatar.mockResolvedValue({ ...mockUser, avatarUrl: null });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepo.findByIdSimple).toHaveBeenCalledWith('user-1');
      expect(mockFileStorage.deleteAvatar).toHaveBeenCalledWith(
        'http://localhost:3001/uploads/avatars/user-1-123456.jpg'
      );
      expect(mockRepo.updateAvatar).toHaveBeenCalledWith('user-1', null);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should not delete file or emit event when user has no avatar', async () => {
      // Arrange
      const userWithoutAvatar = { ...mockUser, avatarUrl: null };
      const command = new DeleteAvatarCommand('user-1');
      mockRepo.findByIdSimple.mockResolvedValue(userWithoutAvatar);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockFileStorage.deleteAvatar).not.toHaveBeenCalled();
      expect(mockRepo.updateAvatar).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const command = new DeleteAvatarCommand('nonexistent-user');
      mockRepo.findByIdSimple.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
      expect(mockFileStorage.deleteAvatar).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit AvatarDeletedEvent with correct data', async () => {
      // Arrange
      const command = new DeleteAvatarCommand('user-1');
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockFileStorage.deleteAvatar.mockResolvedValue(undefined);
      mockRepo.updateAvatar.mockResolvedValue({ ...mockUser, avatarUrl: null });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(AvatarDeletedEvent);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.previousAvatarUrl).toBe(
        'http://localhost:3001/uploads/avatars/user-1-123456.jpg'
      );
    });
  });
});
