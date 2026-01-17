/**
 * DisableUserHandler Unit Tests
 *
 * Tests for disabling user command handler (admin only).
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DisableUserCommand } from '../commands/disable-user.command.js';
import { DisableUserHandler } from '../commands/disable-user.handler.js';
import { UserDisabledEvent } from '../events/user-disabled.event.js';
import type { AdminRepository } from '../repositories/admin.repository.js';

interface MockAdminRepository {
  findAllUsers: Mock;
  findUserById: Mock;
  findUserActivity: Mock;
  updateUserDisabled: Mock;
  anonymizeUserActivity: Mock;
  getLastActiveAt: Mock;
  findUserRoleById: Mock;
  disableUserTransaction: Mock;
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
    disableUserTransaction: vi.fn(),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
  };
}

describe('DisableUserHandler', () => {
  let handler: DisableUserHandler;
  let mockRepository: MockAdminRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new DisableUserHandler(
      mockRepository as unknown as AdminRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    it('should disable user when actor is ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN'); // actor
      mockRepository.findUserById.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'DEVELOPER',
        isDisabled: false,
        disabledAt: null,
        createdAt: new Date(),
      }); // target
      mockRepository.disableUserTransaction.mockResolvedValue({ sessionsDeleted: 3 });
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DisableUserCommand('user-1', 'admin-user');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.disableUserTransaction).toHaveBeenCalledWith('user-1', 'admin-user');
      expect(mockEventBus.publish).toHaveBeenCalledOnce();
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(UserDisabledEvent);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.actorId).toBe('admin-user');
    });

    it('should throw ForbiddenError when actor is not ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('DEVELOPER');

      const command = new DisableUserCommand('user-1', 'regular-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Admin access required');
      expect(mockRepository.disableUserTransaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when trying to disable self', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');

      const command = new DisableUserCommand('admin-user', 'admin-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Cannot disable yourself');
      expect(mockRepository.disableUserTransaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when trying to disable another ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN'); // actor
      mockRepository.findUserById.mockResolvedValueOnce({
        id: 'other-admin',
        email: 'admin@example.com',
        name: 'Other Admin',
        role: 'ADMIN',
        isDisabled: false,
        disabledAt: null,
        createdAt: new Date(),
      }); // target

      const command = new DisableUserCommand('other-admin', 'admin-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Cannot disable another admin');
      expect(mockRepository.disableUserTransaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when target user not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN'); // actor
      mockRepository.findUserById.mockResolvedValueOnce(null); // target

      const command = new DisableUserCommand('nonexistent', 'admin-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
    });

    it('should throw NotFoundError when actor not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce(null);

      const command = new DisableUserCommand('user-1', 'nonexistent');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
    });

    it('should execute all disable operations atomically in a transaction', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');
      mockRepository.findUserById.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'DEVELOPER',
        isDisabled: false,
        disabledAt: null,
        createdAt: new Date(),
      });
      mockRepository.disableUserTransaction.mockResolvedValue({ sessionsDeleted: 5 });
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DisableUserCommand('user-1', 'admin-user');

      // Act
      await handler.execute(command);

      // Assert - transaction handles: disable user, delete sessions, anonymize activity
      expect(mockRepository.disableUserTransaction).toHaveBeenCalledWith('user-1', 'admin-user');
      expect(mockRepository.disableUserTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
