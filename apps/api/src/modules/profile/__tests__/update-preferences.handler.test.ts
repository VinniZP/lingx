import { beforeEach, describe, expect, it } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { UpdatePreferencesCommand } from '../commands/update-preferences.command.js';
import { UpdatePreferencesHandler } from '../commands/update-preferences.handler.js';
import { PreferencesUpdatedEvent } from '../events/preferences-updated.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import { DEFAULT_PREFERENCES } from '../types.js';
import {
  createMockEventBus,
  createMockRepository,
  createMockUser,
  type MockEventBus,
  type MockRepository,
} from './test-utils.js';

describe('UpdatePreferencesHandler', () => {
  let handler: UpdatePreferencesHandler;
  let mockRepo: MockRepository;
  let mockEventBus: MockEventBus;

  const mockUser = createMockUser();

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new UpdatePreferencesHandler(
      mockRepo as unknown as ProfileRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should update theme preference and emit PreferencesUpdatedEvent', async () => {
      // Arrange
      const command = new UpdatePreferencesCommand('user-1', { theme: 'dark' });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.updatePreferences.mockResolvedValue(mockUser);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.theme).toBe('dark');
      expect(result.language).toBe('en'); // Unchanged
      expect(mockRepo.findByIdSimple).toHaveBeenCalledWith('user-1');
      expect(mockRepo.updatePreferences).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          theme: 'dark',
        })
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should update language preference', async () => {
      // Arrange
      const command = new UpdatePreferencesCommand('user-1', { language: 'uk' });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.updatePreferences.mockResolvedValue(mockUser);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.language).toBe('uk');
      expect(result.theme).toBe('system'); // Unchanged
    });

    it('should update notification preferences', async () => {
      // Arrange
      const command = new UpdatePreferencesCommand('user-1', {
        notifications: {
          email: false,
          digestFrequency: 'daily',
        },
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.updatePreferences.mockResolvedValue(mockUser);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.notifications.email).toBe(false);
      expect(result.notifications.digestFrequency).toBe('daily');
      expect(result.notifications.inApp).toBe(true); // Unchanged
    });

    it('should update defaultProjectId when user is project member', async () => {
      // Arrange
      const command = new UpdatePreferencesCommand('user-1', { defaultProjectId: 'project-1' });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.isProjectMember.mockResolvedValue(true);
      mockRepo.updatePreferences.mockResolvedValue(mockUser);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.defaultProjectId).toBe('project-1');
      expect(mockRepo.isProjectMember).toHaveBeenCalledWith('user-1', 'project-1');
    });

    it('should clear defaultProjectId when null is provided', async () => {
      // Arrange
      const userWithProject = {
        ...mockUser,
        preferences: { ...mockUser.preferences, defaultProjectId: 'project-1' },
      };
      const command = new UpdatePreferencesCommand('user-1', { defaultProjectId: null });
      mockRepo.findByIdSimple.mockResolvedValue(userWithProject);
      mockRepo.updatePreferences.mockResolvedValue(mockUser);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.defaultProjectId).toBeNull();
      expect(mockRepo.isProjectMember).not.toHaveBeenCalled();
    });

    it('should use default preferences when user has no preferences set', async () => {
      // Arrange
      const userWithoutPrefs = { ...mockUser, preferences: null };
      const command = new UpdatePreferencesCommand('user-1', { theme: 'dark' });
      mockRepo.findByIdSimple.mockResolvedValue(userWithoutPrefs);
      mockRepo.updatePreferences.mockResolvedValue(mockUser);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.theme).toBe('dark');
      expect(result.language).toBe(DEFAULT_PREFERENCES.language);
    });

    it('should preserve existing notification preferences when partially updating', async () => {
      // Arrange - user has customized notifications
      const userWithCustomNotifications = {
        ...mockUser,
        preferences: {
          theme: 'dark' as const,
          language: 'uk',
          notifications: {
            email: false,
            inApp: false,
            digestFrequency: 'never' as const,
          },
          defaultProjectId: 'project-1',
        },
      };
      // Only update digestFrequency
      const command = new UpdatePreferencesCommand('user-1', {
        notifications: {
          digestFrequency: 'daily',
        },
      });
      mockRepo.findByIdSimple.mockResolvedValue(userWithCustomNotifications);
      mockRepo.updatePreferences.mockResolvedValue(userWithCustomNotifications);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert - verify updatePreferences was called with merged preferences
      expect(mockRepo.updatePreferences).toHaveBeenCalledWith('user-1', {
        theme: 'dark',
        language: 'uk',
        notifications: {
          email: false, // Preserved from existing
          inApp: false, // Preserved from existing
          digestFrequency: 'daily', // Updated
        },
        defaultProjectId: 'project-1', // Preserved from existing
      });
    });

    it('should preserve all other fields when only updating theme', async () => {
      // Arrange
      const userWithFullPrefs = {
        ...mockUser,
        preferences: {
          theme: 'light' as const,
          language: 'uk',
          notifications: {
            email: false,
            inApp: false,
            digestFrequency: 'never' as const,
          },
          defaultProjectId: 'project-123',
        },
      };
      const command = new UpdatePreferencesCommand('user-1', { theme: 'dark' });
      mockRepo.findByIdSimple.mockResolvedValue(userWithFullPrefs);
      mockRepo.updatePreferences.mockResolvedValue(userWithFullPrefs);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert - verify all other preferences are preserved
      expect(mockRepo.updatePreferences).toHaveBeenCalledWith('user-1', {
        theme: 'dark', // Updated
        language: 'uk', // Preserved
        notifications: {
          email: false,
          inApp: false,
          digestFrequency: 'never',
        }, // Preserved
        defaultProjectId: 'project-123', // Preserved
      });
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const command = new UpdatePreferencesCommand('nonexistent-user', { theme: 'dark' });
      mockRepo.findByIdSimple.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
      expect(mockRepo.updatePreferences).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when user is not a member of the project', async () => {
      // Arrange
      const command = new UpdatePreferencesCommand('user-1', { defaultProjectId: 'project-1' });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.isProjectMember.mockResolvedValue(false);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'You are not a member of this project'
      );
      expect(mockRepo.updatePreferences).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit PreferencesUpdatedEvent with correct data', async () => {
      // Arrange
      const command = new UpdatePreferencesCommand('user-1', { theme: 'dark' });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      mockRepo.updatePreferences.mockResolvedValue(mockUser);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(PreferencesUpdatedEvent);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.preferences).toBeDefined();
    });
  });
});
