/**
 * EnableUserHandler Unit Tests
 *
 * Tests for enabling user command handler (admin only).
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { EnableUserCommand } from '../commands/enable-user.command.js';
import { EnableUserHandler } from '../commands/enable-user.handler.js';
import { UserEnabledEvent } from '../events/user-enabled.event.js';
import type { AdminRepository } from '../repositories/admin.repository.js';

interface MockAdminRepository {
  findAllUsers: Mock;
  findUserById: Mock;
  findUserActivity: Mock;
  updateUserDisabled: Mock;
  anonymizeUserActivity: Mock;
  getLastActiveAt: Mock;
  findUserRoleById: Mock;
}

interface MockEventBus {
  publish: Mock;
}

function createMockRepository(): MockAdminRepository {
  return {
    findAllUsers: vi.fn(),
    findUserById: vi.fn(),
    findUserActivity: vi.fn(),
    updateUserDisabled: vi.fn(),
    anonymizeUserActivity: vi.fn(),
    getLastActiveAt: vi.fn(),
    findUserRoleById: vi.fn(),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
  };
}

describe('EnableUserHandler', () => {
  let handler: EnableUserHandler;
  let mockRepository: MockAdminRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new EnableUserHandler(
      mockRepository as unknown as AdminRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    it('should enable user when actor is ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById
        .mockResolvedValueOnce('ADMIN') // actor check
        .mockResolvedValueOnce('DEVELOPER'); // target exists check
      mockRepository.updateUserDisabled.mockResolvedValue({ id: 'user-1', isDisabled: false });
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new EnableUserCommand('user-1', 'admin-user');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.updateUserDisabled).toHaveBeenCalledWith('user-1', false);
      expect(mockEventBus.publish).toHaveBeenCalledOnce();
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(UserEnabledEvent);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.actorId).toBe('admin-user');
    });

    it('should throw ForbiddenError when actor is not ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('DEVELOPER');

      const command = new EnableUserCommand('user-1', 'regular-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Admin access required');
      expect(mockRepository.updateUserDisabled).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when actor is MANAGER', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('MANAGER');

      const command = new EnableUserCommand('user-1', 'manager-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Admin access required');
    });

    it('should throw NotFoundError when actor not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce(null);

      const command = new EnableUserCommand('user-1', 'nonexistent');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
    });

    it('should clear disabled fields on enable', async () => {
      // Arrange
      mockRepository.findUserRoleById
        .mockResolvedValueOnce('ADMIN') // actor check
        .mockResolvedValueOnce('DEVELOPER'); // target exists check
      mockRepository.updateUserDisabled.mockResolvedValue({
        id: 'user-1',
        isDisabled: false,
        disabledAt: null,
        disabledById: null,
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new EnableUserCommand('user-1', 'admin-user');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.updateUserDisabled).toHaveBeenCalledWith('user-1', false);
    });

    it('should throw NotFoundError when target user not found', async () => {
      // Arrange
      mockRepository.findUserRoleById
        .mockResolvedValueOnce('ADMIN') // actor check passes
        .mockResolvedValueOnce(null); // target not found

      const command = new EnableUserCommand('nonexistent-user', 'admin-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Target user not found');
      expect(mockRepository.updateUserDisabled).not.toHaveBeenCalled();
    });
  });
});
