/**
 * RemoveMemberHandler Unit Tests
 *
 * Tests for removing a member from a project.
 *
 * Permission rules:
 * - Only OWNER can remove members
 *
 * Constraints:
 * - Cannot remove the last OWNER
 */

import type { ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { RemoveMemberCommand } from '../commands/remove-member.command.js';
import { RemoveMemberHandler } from '../commands/remove-member.handler.js';
import { MemberRemovedEvent } from '../events/member-removed.event.js';
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

describe('RemoveMemberHandler', () => {
  let handler: RemoveMemberHandler;
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
    handler = new RemoveMemberHandler(
      mockMemberRepository as unknown as MemberRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    describe('OWNER permissions', () => {
      it('should allow OWNER to remove a DEVELOPER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember) // actor lookup
          .mockResolvedValueOnce(targetMember); // target lookup
        mockMemberRepository.removeMember.mockResolvedValue(undefined);

        const command = new RemoveMemberCommand(projectId, targetUserId, ownerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(projectId, targetUserId);
      });

      it('should allow OWNER to remove a MANAGER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(managerMember);
        mockMemberRepository.removeMember.mockResolvedValue(undefined);

        const command = new RemoveMemberCommand(projectId, managerId, ownerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(projectId, managerId);
      });

      it('should emit MemberRemovedEvent on successful removal', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(targetMember);
        mockMemberRepository.removeMember.mockResolvedValue(undefined);

        const command = new RemoveMemberCommand(projectId, targetUserId, ownerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledOnce();
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent).toBeInstanceOf(MemberRemovedEvent);
        expect(publishedEvent.projectId).toBe(projectId);
        expect(publishedEvent.userId).toBe(targetUserId);
        expect(publishedEvent.actorId).toBe(ownerId);
      });
    });

    describe('non-OWNER permissions', () => {
      it('should throw ForbiddenError when MANAGER tries to remove a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(managerMember);

        const command = new RemoveMemberCommand(projectId, targetUserId, managerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('Only owners can remove members');
      });

      it('should throw ForbiddenError when DEVELOPER tries to remove a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(developerMember);

        const command = new RemoveMemberCommand(projectId, targetUserId, developerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('Only owners can remove members');
      });
    });

    describe('OWNER removal constraints', () => {
      it('should allow OWNER to remove another OWNER when multiple exist', async () => {
        // Arrange
        const targetOwner = createMockMember({ userId: targetUserId, role: 'OWNER' });
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(targetOwner);
        mockMemberRepository.countOwners.mockResolvedValue(2);
        mockMemberRepository.removeMember.mockResolvedValue(undefined);

        const command = new RemoveMemberCommand(projectId, targetUserId, ownerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(projectId, targetUserId);
      });

      it('should throw BadRequestError when removing the last OWNER', async () => {
        // Arrange
        const soleOwner = createMockMember({ userId: targetUserId, role: 'OWNER' });
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(soleOwner);
        mockMemberRepository.countOwners.mockResolvedValue(1);

        const command = new RemoveMemberCommand(projectId, targetUserId, ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('Cannot remove the last owner');
      });

      it('should throw BadRequestError when OWNER tries to remove themselves if sole OWNER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(ownerMember)
          .mockResolvedValueOnce(ownerMember);
        mockMemberRepository.countOwners.mockResolvedValue(1);

        const command = new RemoveMemberCommand(projectId, ownerId, ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('Cannot remove the last owner');
      });
    });

    describe('validation errors', () => {
      it('should throw ForbiddenError when actor is not a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(null);

        const command = new RemoveMemberCommand(projectId, targetUserId, 'nonmember');

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

        const command = new RemoveMemberCommand(projectId, 'nonmember', ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Target user is not a member of this project'
        );
      });
    });
  });
});
