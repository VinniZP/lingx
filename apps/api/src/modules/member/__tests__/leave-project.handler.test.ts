/**
 * LeaveProjectHandler Unit Tests
 *
 * Tests for a member leaving a project voluntarily.
 *
 * Constraints:
 * - User must be a member of the project
 * - Sole OWNER cannot leave the project
 */

import type { ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { LeaveProjectCommand } from '../commands/leave-project.command.js';
import { LeaveProjectHandler } from '../commands/leave-project.handler.js';
import { MemberLeftEvent } from '../events/member-left.event.js';
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

describe('LeaveProjectHandler', () => {
  let handler: LeaveProjectHandler;
  let mockMemberRepository: MockMemberRepository;
  let mockEventBus: MockEventBus;

  const projectId = 'project-1';
  const ownerId = 'owner-1';
  const managerId = 'manager-1';
  const developerId = 'developer-1';

  const ownerMember = createMockMember({ userId: ownerId, role: 'OWNER' });
  const managerMember = createMockMember({ userId: managerId, role: 'MANAGER' });
  const developerMember = createMockMember({ userId: developerId, role: 'DEVELOPER' });

  beforeEach(() => {
    mockMemberRepository = createMockMemberRepository();
    mockEventBus = createMockEventBus();
    handler = new LeaveProjectHandler(
      mockMemberRepository as unknown as MemberRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    describe('successful leave', () => {
      it('should allow DEVELOPER to leave the project', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(developerMember);
        mockMemberRepository.removeMember.mockResolvedValue(undefined);

        const command = new LeaveProjectCommand(projectId, developerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(projectId, developerId);
      });

      it('should allow MANAGER to leave the project', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(managerMember);
        mockMemberRepository.removeMember.mockResolvedValue(undefined);

        const command = new LeaveProjectCommand(projectId, managerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(projectId, managerId);
      });

      it('should allow OWNER to leave when multiple OWNERs exist', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockMemberRepository.countOwners.mockResolvedValue(2);
        mockMemberRepository.removeMember.mockResolvedValue(undefined);

        const command = new LeaveProjectCommand(projectId, ownerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(projectId, ownerId);
      });

      it('should emit MemberLeftEvent on successful leave', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(developerMember);
        mockMemberRepository.removeMember.mockResolvedValue(undefined);

        const command = new LeaveProjectCommand(projectId, developerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledOnce();
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent).toBeInstanceOf(MemberLeftEvent);
        expect(publishedEvent.projectId).toBe(projectId);
        expect(publishedEvent.userId).toBe(developerId);
      });
    });

    describe('OWNER leave constraints', () => {
      it('should throw BadRequestError when sole OWNER tries to leave', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockMemberRepository.countOwners.mockResolvedValue(1);

        const command = new LeaveProjectCommand(projectId, ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Cannot leave project as the sole owner'
        );
      });
    });

    describe('validation errors', () => {
      it('should throw ForbiddenError when user is not a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(null);

        const command = new LeaveProjectCommand(projectId, 'nonmember');

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'You are not a member of this project'
        );
      });
    });
  });
});
