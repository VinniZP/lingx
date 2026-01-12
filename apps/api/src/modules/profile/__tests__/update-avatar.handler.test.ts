import { beforeEach, describe, expect, it } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { FileStorageService } from '../../../shared/infrastructure/file-storage.service.js';
import { UpdateAvatarCommand } from '../commands/update-avatar.command.js';
import { UpdateAvatarHandler } from '../commands/update-avatar.handler.js';
import { AvatarUpdatedEvent } from '../events/avatar-updated.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import {
  createMockEventBus,
  createMockFile,
  createMockFileStorage,
  createMockRepository,
  createMockUser,
  type MockEventBus,
  type MockFileStorage,
  type MockRepository,
} from './test-utils.js';

describe('UpdateAvatarHandler', () => {
  let handler: UpdateAvatarHandler;
  let mockRepo: MockRepository;
  let mockFileStorage: MockFileStorage;
  let mockEventBus: MockEventBus;

  const mockUser = createMockUser({ preferences: null });

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockFileStorage = createMockFileStorage();
    mockEventBus = createMockEventBus();
    handler = new UpdateAvatarHandler(
      mockRepo as unknown as ProfileRepository,
      mockFileStorage as unknown as FileStorageService,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should upload avatar and emit AvatarUpdatedEvent', async () => {
      // Arrange
      const mockFile = createMockFile();
      const command = new UpdateAvatarCommand('user-1', mockFile);
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockFileStorage.saveAvatar.mockResolvedValue({
        filePath: 'avatars/user-1-123456.jpg',
        publicUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockRepo.updateAvatar.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.avatarUrl).toBe('http://localhost:3001/uploads/avatars/user-1-123456.jpg');
      expect(mockRepo.findByIdSimple).toHaveBeenCalledWith('user-1');
      expect(mockFileStorage.saveAvatar).toHaveBeenCalledWith('user-1', mockFile);
      expect(mockRepo.updateAvatar).toHaveBeenCalledWith(
        'user-1',
        'http://localhost:3001/uploads/avatars/user-1-123456.jpg'
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should delete old avatar after uploading new one', async () => {
      // Arrange
      const userWithAvatar = {
        ...mockUser,
        avatarUrl: 'http://localhost:3001/uploads/avatars/old-avatar.jpg',
      };
      const mockFile = createMockFile();
      const command = new UpdateAvatarCommand('user-1', mockFile);
      mockRepo.findByIdSimple.mockResolvedValue(userWithAvatar);
      mockFileStorage.deleteAvatar.mockResolvedValue(undefined);
      mockFileStorage.saveAvatar.mockResolvedValue({
        filePath: 'avatars/user-1-123456.jpg',
        publicUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockRepo.updateAvatar.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert - saveAvatar called before deleteAvatar
      expect(mockFileStorage.saveAvatar).toHaveBeenCalled();
      expect(mockFileStorage.deleteAvatar).toHaveBeenCalledWith(
        'http://localhost:3001/uploads/avatars/old-avatar.jpg'
      );
    });

    it('should not call deleteAvatar when user has no existing avatar', async () => {
      // Arrange
      const mockFile = createMockFile();
      const command = new UpdateAvatarCommand('user-1', mockFile);
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockFileStorage.saveAvatar.mockResolvedValue({
        filePath: 'avatars/user-1-123456.jpg',
        publicUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockRepo.updateAvatar.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockFileStorage.deleteAvatar).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const mockFile = createMockFile();
      const command = new UpdateAvatarCommand('nonexistent-user', mockFile);
      mockRepo.findByIdSimple.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
      expect(mockFileStorage.saveAvatar).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw when file storage save fails', async () => {
      // Arrange
      const mockFile = createMockFile();
      const command = new UpdateAvatarCommand('user-1', mockFile);
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockFileStorage.saveAvatar.mockRejectedValue(new Error('Disk full'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Disk full');
      expect(mockRepo.updateAvatar).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should succeed even when deleteAvatar fails for old avatar', async () => {
      // Arrange - user has existing avatar, delete fails
      const userWithAvatar = {
        ...mockUser,
        avatarUrl: 'http://localhost:3001/uploads/avatars/old-avatar.jpg',
      };
      const mockFile = createMockFile();
      const command = new UpdateAvatarCommand('user-1', mockFile);
      mockRepo.findByIdSimple.mockResolvedValue(userWithAvatar);
      mockFileStorage.saveAvatar.mockResolvedValue({
        filePath: 'avatars/user-1-123456.jpg',
        publicUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockRepo.updateAvatar.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockFileStorage.deleteAvatar.mockRejectedValue(new Error('File not found'));
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act - should not throw
      const result = await handler.execute(command);

      // Assert - operation succeeded despite delete failure
      expect(result.avatarUrl).toBe('http://localhost:3001/uploads/avatars/user-1-123456.jpg');
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should propagate repository errors and not emit events', async () => {
      // Arrange
      const mockFile = createMockFile();
      const command = new UpdateAvatarCommand('user-1', mockFile);
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockFileStorage.saveAvatar.mockResolvedValue({
        filePath: 'avatars/user-1-123456.jpg',
        publicUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockRepo.updateAvatar.mockRejectedValue(new Error('Database connection lost'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database connection lost');
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit AvatarUpdatedEvent with correct data', async () => {
      // Arrange
      const userWithAvatar = {
        ...mockUser,
        avatarUrl: 'http://localhost:3001/uploads/avatars/old-avatar.jpg',
      };
      const mockFile = createMockFile();
      const command = new UpdateAvatarCommand('user-1', mockFile);
      mockRepo.findByIdSimple.mockResolvedValue(userWithAvatar);
      mockFileStorage.deleteAvatar.mockResolvedValue(undefined);
      mockFileStorage.saveAvatar.mockResolvedValue({
        filePath: 'avatars/user-1-123456.jpg',
        publicUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockRepo.updateAvatar.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'http://localhost:3001/uploads/avatars/user-1-123456.jpg',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(AvatarUpdatedEvent);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.avatarUrl).toBe(
        'http://localhost:3001/uploads/avatars/user-1-123456.jpg'
      );
      expect(publishedEvent.previousAvatarUrl).toBe(
        'http://localhost:3001/uploads/avatars/old-avatar.jpg'
      );
    });
  });
});
