/**
 * ImpersonateUserHandler Unit Tests
 *
 * Tests for impersonating user command handler (admin only).
 */

import type { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { ImpersonateUserCommand } from '../commands/impersonate-user.command.js';
import { ImpersonateUserHandler } from '../commands/impersonate-user.handler.js';
import { UserImpersonatedEvent } from '../events/user-impersonated.event.js';
import type { AdminRepository, UserWithProjects } from '../repositories/admin.repository.js';

interface MockAdminRepository {
  findAllUsers: Mock;
  findUserById: Mock;
  findUserActivity: Mock;
  updateUserDisabled: Mock;
  anonymizeUserActivity: Mock;
  getLastActiveAt: Mock;
  findUserRoleById: Mock;
}

interface MockJwtService {
  sign: Mock;
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

function createMockJwtService(): MockJwtService {
  return {
    sign: vi.fn(),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
  };
}

describe('ImpersonateUserHandler', () => {
  let handler: ImpersonateUserHandler;
  let mockRepository: MockAdminRepository;
  let mockJwtService: MockJwtService;
  let mockEventBus: MockEventBus;

  const mockTargetUser: UserWithProjects = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    avatarUrl: null,
    role: 'DEVELOPER' as Role,
    isDisabled: false,
    disabledAt: null,
    createdAt: new Date('2024-01-01'),
    disabledBy: null,
    projectMembers: [],
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockJwtService = createMockJwtService();
    mockEventBus = createMockEventBus();
    handler = new ImpersonateUserHandler(
      mockRepository as unknown as AdminRepository,
      mockJwtService as unknown as {
        sign: (payload: Record<string, unknown>, options: { expiresIn: string }) => string;
      },
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    it('should return impersonation token when actor is ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');
      mockRepository.findUserById.mockResolvedValue(mockTargetUser);
      mockJwtService.sign.mockReturnValue('impersonation-jwt-token');
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new ImpersonateUserCommand('user-1', 'admin-user');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.token).toBe('impersonation-jwt-token');
      expect(result.expiresAt).toBeDefined();
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          impersonatedBy: 'admin-user',
          purpose: 'impersonation',
        },
        { expiresIn: '1h' }
      );
      expect(mockEventBus.publish).toHaveBeenCalledOnce();
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(UserImpersonatedEvent);
    });

    it('should throw ForbiddenError when actor is not ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('DEVELOPER');

      const command = new ImpersonateUserCommand('user-1', 'regular-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Admin access required');
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when trying to impersonate self', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');

      const command = new ImpersonateUserCommand('admin-user', 'admin-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Cannot impersonate yourself');
    });

    it('should throw BadRequestError when target user is disabled', async () => {
      // Arrange
      const disabledUser = { ...mockTargetUser, isDisabled: true };
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');
      mockRepository.findUserById.mockResolvedValue(disabledUser);

      const command = new ImpersonateUserCommand('user-1', 'admin-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Cannot impersonate a disabled user');
    });

    it('should throw NotFoundError when target user not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');
      mockRepository.findUserById.mockResolvedValue(null);

      const command = new ImpersonateUserCommand('nonexistent', 'admin-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
    });

    it('should throw NotFoundError when actor not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce(null);

      const command = new ImpersonateUserCommand('user-1', 'nonexistent');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
    });

    it('should emit UserImpersonatedEvent with correct data', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');
      mockRepository.findUserById.mockResolvedValue(mockTargetUser);
      mockJwtService.sign.mockReturnValue('token');
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new ImpersonateUserCommand('user-1', 'admin-user');

      // Act
      await handler.execute(command);

      // Assert
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as UserImpersonatedEvent;
      expect(publishedEvent.targetUserId).toBe('user-1');
      expect(publishedEvent.actorId).toBe('admin-user');
      expect(publishedEvent.tokenExpiry).toBeDefined();
    });
  });
});
