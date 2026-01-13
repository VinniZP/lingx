/**
 * UpdateMemberRoleHandler Unit Tests
 *
 * Tests for updating a member's role in a project.
 *
 * Permission rules:
 * - OWNER can change any role (OWNER, MANAGER, DEVELOPER)
 * - MANAGER can only change to/from DEVELOPER role
 * - DEVELOPER cannot change any role
 *
 * Constraints:
 * - Cannot demote the last OWNER
 * - Sole OWNER cannot demote themselves
 */

import type { ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { UpdateMemberRoleCommand } from '../commands/update-member-role.command.js';
import { UpdateMemberRoleHandler } from '../commands/update-member-role.handler.js';
import { MemberRoleChangedEvent } from '../events/member-role-changed.event.js';
import type { MemberRepository, ProjectMemberWithUser } from '../repositories/member.repository.js';

interface MockMemberRepository {
  findProjectMembers: Mock;
  findMemberByUserId: Mock;
  updateMemberRole: Mock;
  removeMember: Mock;
  countOwners: Mock;
  addMember: Mock;
  findUserByEmail: Mock;
}

interface MockEventBus {
  publish: Mock;
}

function createMockMemberRepository(): MockMemberRepository {
  return {
    findProjectMembers: vi.fn(),
    findMemberByUserId: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    countOwners: vi.fn(),
    addMember: vi.fn(),
    findUserByEmail: vi.fn(),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
  };
}

function createMockMember(overrides: Partial<ProjectMemberWithUser> = {}): ProjectMemberWithUser {
  return {
    userId: 'user-1',
    role: 'DEVELOPER' as ProjectRole,
    createdAt: new Date('2024-01-01'),
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: null,
    },
    ...overrides,
  };
}

describe('UpdateMemberRoleHandler', () => {
  let handler: UpdateMemberRoleHandler;
  let mockMemberRepository: MockMemberRepository;
  let mockEventBus: MockEventBus;

  const projectId = 'project-1';
  const ownerId = 'owner-1';
  const managerId = 'manager-1';
  const developerId = 'developer-1';
  const targetUserId = 'target-1';

  const ownerMember = createMockMember({ userId: ownerId, role: 'OWNER' });
  const managerMember = createMockMember({ userId: managerId, role: 'MANAGER' });
  const developerMember = createMockMember({ userId: developerId, role: 'DEVELOPER' });
  const targetMember = createMockMember({ userId: targetUserId, role: 'DEVELOPER' });

  beforeEach(() => {
    mockMemberRepository = createMockMemberRepository();
    mockEventBus = createMockEventBus();
    handler = new UpdateMemberRoleHandler(
      mockMemberRepository as unknown as MemberRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    describe('OWNER permissions', () => {
      it('should allow OWNER to change DEVELOPER to MANAGER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember) // actor lookup
          .mockResolvedValueOnce(targetMember); // target lookup
        mockMemberRepository.updateMemberRole.mockResolvedValue({
          ...targetMember,
          role: 'MANAGER',
        });

        const command = new UpdateMemberRoleCommand(projectId, targetUserId, 'MANAGER', ownerId);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.role).toBe('MANAGER');
        expect(mockMemberRepository.updateMemberRole).toHaveBeenCalledWith(
          projectId,
          targetUserId,
          'MANAGER'
        );
      });

      it('should allow OWNER to change MANAGER to OWNER', async () => {
        // Arrange
        const targetAsManager = createMockMember({ userId: targetUserId, role: 'MANAGER' });
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(targetAsManager);
        mockMemberRepository.updateMemberRole.mockResolvedValue({
          ...targetAsManager,
          role: 'OWNER',
        });

        const command = new UpdateMemberRoleCommand(projectId, targetUserId, 'OWNER', ownerId);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.role).toBe('OWNER');
      });

      it('should emit MemberRoleChangedEvent on successful update', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(targetMember);
        const updatedMember = { ...targetMember, role: 'MANAGER' as ProjectRole };
        mockMemberRepository.updateMemberRole.mockResolvedValue(updatedMember);

        const command = new UpdateMemberRoleCommand(projectId, targetUserId, 'MANAGER', ownerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledOnce();
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent).toBeInstanceOf(MemberRoleChangedEvent);
        expect(publishedEvent.projectId).toBe(projectId);
        expect(publishedEvent.userId).toBe(targetUserId);
        expect(publishedEvent.oldRole).toBe('DEVELOPER');
        expect(publishedEvent.newRole).toBe('MANAGER');
        expect(publishedEvent.actorId).toBe(ownerId);
      });
    });

    describe('MANAGER permissions', () => {
      it('should allow MANAGER to change DEVELOPER to DEVELOPER (no-op)', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(managerMember)
          .mockResolvedValueOnce(targetMember);
        mockMemberRepository.updateMemberRole.mockResolvedValue(targetMember);

        const command = new UpdateMemberRoleCommand(
          projectId,
          targetUserId,
          'DEVELOPER',
          managerId
        );

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.role).toBe('DEVELOPER');
      });

      it('should throw ForbiddenError when MANAGER tries to change to MANAGER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(managerMember)
          .mockResolvedValueOnce(targetMember);

        const command = new UpdateMemberRoleCommand(projectId, targetUserId, 'MANAGER', managerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Managers can only change developer roles'
        );
      });

      it('should throw ForbiddenError when MANAGER tries to change to OWNER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(managerMember)
          .mockResolvedValueOnce(targetMember);

        const command = new UpdateMemberRoleCommand(projectId, targetUserId, 'OWNER', managerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Managers can only change developer roles'
        );
      });

      it('should throw ForbiddenError when MANAGER tries to change MANAGER role', async () => {
        // Arrange
        const targetAsManager = createMockMember({ userId: targetUserId, role: 'MANAGER' });
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(managerMember)
          .mockResolvedValueOnce(targetAsManager);

        const command = new UpdateMemberRoleCommand(
          projectId,
          targetUserId,
          'DEVELOPER',
          managerId
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Managers can only change developer roles'
        );
      });
    });

    describe('DEVELOPER permissions', () => {
      it('should throw ForbiddenError when DEVELOPER tries to change any role', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(developerMember);

        const command = new UpdateMemberRoleCommand(
          projectId,
          targetUserId,
          'MANAGER',
          developerId
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Only owners and managers can change member roles'
        );
      });
    });

    describe('OWNER demotion constraints', () => {
      it('should throw BadRequestError when demoting the last OWNER', async () => {
        // Arrange
        const anotherOwner = createMockMember({ userId: 'another-owner', role: 'OWNER' });
        const soleOwner = createMockMember({ userId: ownerId, role: 'OWNER' });
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(anotherOwner) // actor (another owner)
          .mockResolvedValueOnce(soleOwner); // target owner
        mockMemberRepository.countOwners.mockResolvedValue(1);

        const command = new UpdateMemberRoleCommand(projectId, ownerId, 'MANAGER', 'another-owner');

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('Cannot demote the last owner');
      });

      it('should throw BadRequestError when sole OWNER tries to demote themselves', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember) // actor lookup (self)
          .mockResolvedValueOnce(ownerMember); // target lookup (self)
        mockMemberRepository.countOwners.mockResolvedValue(1);

        const command = new UpdateMemberRoleCommand(projectId, ownerId, 'MANAGER', ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('Cannot demote the last owner');
      });

      it('should allow OWNER demotion when multiple OWNERs exist', async () => {
        // Arrange
        const targetOwner = createMockMember({ userId: targetUserId, role: 'OWNER' });
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(targetOwner);
        mockMemberRepository.countOwners.mockResolvedValue(2);
        mockMemberRepository.updateMemberRole.mockResolvedValue({
          ...targetOwner,
          role: 'MANAGER',
        });

        const command = new UpdateMemberRoleCommand(projectId, targetUserId, 'MANAGER', ownerId);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.role).toBe('MANAGER');
      });
    });

    describe('validation errors', () => {
      it('should throw ForbiddenError when actor is not a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(null);

        const command = new UpdateMemberRoleCommand(
          projectId,
          targetUserId,
          'MANAGER',
          'nonmember'
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'You are not a member of this project'
        );
      });

      it('should throw ForbiddenError when target is not a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(null);

        const command = new UpdateMemberRoleCommand(projectId, 'nonmember', 'MANAGER', ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Target user is not a member of this project'
        );
      });

      it('should skip update and event when role is unchanged', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(targetMember);

        const command = new UpdateMemberRoleCommand(projectId, targetUserId, 'DEVELOPER', ownerId);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result).toBe(targetMember);
        expect(mockMemberRepository.updateMemberRole).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });
  });
});
