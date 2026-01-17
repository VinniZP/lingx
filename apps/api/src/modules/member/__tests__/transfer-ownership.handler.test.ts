/**
 * TransferOwnershipHandler Unit Tests
 *
 * Tests for transferring ownership of a project.
 *
 * Permission rules:
 * - Only OWNER can transfer ownership
 *
 * Logic:
 * - Target must be an existing project member
 * - Target becomes OWNER
 * - If keepOwnership=false AND multiple owners, current owner is demoted to MANAGER
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { TransferOwnershipCommand } from '../commands/transfer-ownership.command.js';
import { TransferOwnershipHandler } from '../commands/transfer-ownership.handler.js';
import { OwnershipTransferredEvent } from '../events/ownership-transferred.event.js';
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

interface MockPrisma {
  $transaction: Mock;
  projectMember: { update: Mock; count: Mock };
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

function createMockPrisma(ownerCountAfterPromotion = 2): MockPrisma {
  const mockTx = {
    projectMember: {
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(ownerCountAfterPromotion),
    },
  };
  return {
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      await fn(mockTx);
    }),
    projectMember: mockTx.projectMember,
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

describe('TransferOwnershipHandler', () => {
  let handler: TransferOwnershipHandler;
  let mockMemberRepository: MockMemberRepository;
  let mockEventBus: MockEventBus;
  let mockPrisma: MockPrisma;

  const projectId = 'project-1';
  const currentOwnerId = 'owner-1';
  const newOwnerId = 'new-owner-1';
  const managerId = 'manager-1';
  const developerId = 'developer-1';

  const currentOwnerMember = createMockMember({ userId: currentOwnerId, role: 'OWNER' });
  const managerMember = createMockMember({ userId: managerId, role: 'MANAGER' });
  const developerMember = createMockMember({ userId: developerId, role: 'DEVELOPER' });
  const newOwnerMember = createMockMember({ userId: newOwnerId, role: 'MANAGER' });

  beforeEach(() => {
    mockMemberRepository = createMockMemberRepository();
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrisma();
    handler = new TransferOwnershipHandler(
      mockMemberRepository as unknown as MemberRepository,
      mockEventBus as unknown as IEventBus,
      mockPrisma as unknown as PrismaClient
    );
  });

  describe('execute', () => {
    describe('successful ownership transfer', () => {
      it('should transfer ownership from OWNER to MANAGER with keepOwnership=true via transaction', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(currentOwnerMember) // actor lookup
          .mockResolvedValueOnce(newOwnerMember); // target lookup

        const command = new TransferOwnershipCommand(projectId, newOwnerId, currentOwnerId, true);

        // Act
        await handler.execute(command);

        // Assert - transaction was called
        expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
        // Assert - target was promoted to OWNER
        expect(mockPrisma.projectMember.update).toHaveBeenCalledWith({
          where: { projectId_userId: { projectId, userId: newOwnerId } },
          data: { role: 'OWNER' },
        });
        // Assert - current owner was NOT demoted (keepOwnership=true)
        expect(mockPrisma.projectMember.count).not.toHaveBeenCalled();
      });

      it('should transfer ownership from OWNER to DEVELOPER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(currentOwnerMember)
          .mockResolvedValueOnce(developerMember);

        const command = new TransferOwnershipCommand(projectId, developerId, currentOwnerId, true);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockPrisma.projectMember.update).toHaveBeenCalledWith({
          where: { projectId_userId: { projectId, userId: developerId } },
          data: { role: 'OWNER' },
        });
      });

      it('should demote current owner to MANAGER when keepOwnership=false and multiple owners exist', async () => {
        // Arrange
        mockPrisma = createMockPrisma(2); // 2 owners after promotion
        handler = new TransferOwnershipHandler(
          mockMemberRepository as unknown as MemberRepository,
          mockEventBus as unknown as IEventBus,
          mockPrisma as unknown as PrismaClient
        );
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(currentOwnerMember)
          .mockResolvedValueOnce(newOwnerMember);

        const command = new TransferOwnershipCommand(projectId, newOwnerId, currentOwnerId, false);

        // Act
        await handler.execute(command);

        // Assert - target promoted and current owner demoted
        expect(mockPrisma.projectMember.update).toHaveBeenCalledTimes(2);
        expect(mockPrisma.projectMember.update).toHaveBeenNthCalledWith(1, {
          where: { projectId_userId: { projectId, userId: newOwnerId } },
          data: { role: 'OWNER' },
        });
        expect(mockPrisma.projectMember.update).toHaveBeenNthCalledWith(2, {
          where: { projectId_userId: { projectId, userId: currentOwnerId } },
          data: { role: 'MANAGER' },
        });
      });

      it('should NOT demote current owner when keepOwnership=false but they would be sole owner after transfer', async () => {
        // Arrange - only 1 owner after promotion (edge case: target was already OWNER)
        mockPrisma = createMockPrisma(1);
        handler = new TransferOwnershipHandler(
          mockMemberRepository as unknown as MemberRepository,
          mockEventBus as unknown as IEventBus,
          mockPrisma as unknown as PrismaClient
        );
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(currentOwnerMember)
          .mockResolvedValueOnce(newOwnerMember);

        const command = new TransferOwnershipCommand(projectId, newOwnerId, currentOwnerId, false);

        // Act
        await handler.execute(command);

        // Assert - only promotion, no demotion since count is 1
        expect(mockPrisma.projectMember.update).toHaveBeenCalledTimes(1);
        expect(mockPrisma.projectMember.count).toHaveBeenCalled();
      });

      it('should emit OwnershipTransferredEvent on successful transfer', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(currentOwnerMember)
          .mockResolvedValueOnce(newOwnerMember);

        const command = new TransferOwnershipCommand(projectId, newOwnerId, currentOwnerId, true);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledOnce();
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent).toBeInstanceOf(OwnershipTransferredEvent);
        expect(publishedEvent.projectId).toBe(projectId);
        expect(publishedEvent.newOwnerId).toBe(newOwnerId);
        expect(publishedEvent.previousOwnerId).toBe(currentOwnerId);
      });

      it('should skip promotion if target is already OWNER', async () => {
        // Arrange
        const targetAlreadyOwner = createMockMember({ userId: newOwnerId, role: 'OWNER' });
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(currentOwnerMember)
          .mockResolvedValueOnce(targetAlreadyOwner);

        const command = new TransferOwnershipCommand(projectId, newOwnerId, currentOwnerId, true);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockPrisma.projectMember.update).not.toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledOnce(); // Still emit event
      });
    });

    describe('permission errors', () => {
      it('should throw ForbiddenError when actor is not a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(null);

        const command = new TransferOwnershipCommand(projectId, newOwnerId, 'nonmember', true);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'You are not a member of this project'
        );
      });

      it('should throw ForbiddenError when actor is MANAGER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(managerMember);

        const command = new TransferOwnershipCommand(projectId, newOwnerId, managerId, true);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Only owners can transfer ownership'
        );
      });

      it('should throw ForbiddenError when actor is DEVELOPER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(developerMember);

        const command = new TransferOwnershipCommand(projectId, newOwnerId, developerId, true);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Only owners can transfer ownership'
        );
      });
    });

    describe('validation errors', () => {
      it('should throw ForbiddenError when target is not a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId
          .mockResolvedValueOnce(currentOwnerMember)
          .mockResolvedValueOnce(null);

        const command = new TransferOwnershipCommand(projectId, 'nonmember', currentOwnerId, true);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Target user is not a member of this project'
        );
      });
    });
  });
});
