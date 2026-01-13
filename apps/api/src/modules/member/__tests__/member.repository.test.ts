/**
 * MemberRepository Unit Tests
 *
 * Tests data access methods for project member operations.
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberRepository } from '../repositories/member.repository.js';

describe('MemberRepository', () => {
  const mockPrisma = {
    projectMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };

  const createRepository = () => new MemberRepository(mockPrisma as unknown as PrismaClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findProjectMembers', () => {
    it('should return all members with user details sorted alphabetically', async () => {
      const repository = createRepository();

      const mockMembers = [
        {
          userId: 'user-2',
          role: 'DEVELOPER' as ProjectRole,
          createdAt: new Date('2024-01-01'),
          user: { id: 'user-2', name: 'Bob', email: 'bob@example.com', avatarUrl: null },
        },
        {
          userId: 'user-1',
          role: 'OWNER' as ProjectRole,
          createdAt: new Date('2024-01-01'),
          user: {
            id: 'user-1',
            name: 'Alice',
            email: 'alice@example.com',
            avatarUrl: 'https://...',
          },
        },
      ];

      mockPrisma.projectMember.findMany.mockResolvedValue(mockMembers);

      const result = await repository.findProjectMembers('project-1');

      expect(mockPrisma.projectMember.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no members exist', async () => {
      const repository = createRepository();

      mockPrisma.projectMember.findMany.mockResolvedValue([]);

      const result = await repository.findProjectMembers('project-1');

      expect(result).toEqual([]);
    });
  });

  describe('findMemberByUserId', () => {
    it('should return member with user details when found', async () => {
      const repository = createRepository();

      const mockMember = {
        userId: 'user-1',
        role: 'OWNER' as ProjectRole,
        createdAt: new Date('2024-01-01'),
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null },
      };

      mockPrisma.projectMember.findUnique.mockResolvedValue(mockMember);

      const result = await repository.findMemberByUserId('project-1', 'user-1');

      expect(mockPrisma.projectMember.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_userId: {
            projectId: 'project-1',
            userId: 'user-1',
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });
      expect(result).toEqual(mockMember);
    });

    it('should return null when member not found', async () => {
      const repository = createRepository();

      mockPrisma.projectMember.findUnique.mockResolvedValue(null);

      const result = await repository.findMemberByUserId('project-1', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const repository = createRepository();

      const updatedMember = {
        userId: 'user-1',
        role: 'MANAGER' as ProjectRole,
        createdAt: new Date('2024-01-01'),
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null },
      };

      mockPrisma.projectMember.update.mockResolvedValue(updatedMember);

      const result = await repository.updateMemberRole('project-1', 'user-1', 'MANAGER');

      expect(mockPrisma.projectMember.update).toHaveBeenCalledWith({
        where: {
          projectId_userId: {
            projectId: 'project-1',
            userId: 'user-1',
          },
        },
        data: { role: 'MANAGER' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });
      expect(result.role).toBe('MANAGER');
    });
  });

  describe('removeMember', () => {
    it('should delete membership record', async () => {
      const repository = createRepository();

      mockPrisma.projectMember.delete.mockResolvedValue({
        projectId: 'project-1',
        userId: 'user-1',
        role: 'DEVELOPER' as ProjectRole,
        createdAt: new Date('2024-01-01'),
        id: 'member-1',
      });

      await repository.removeMember('project-1', 'user-1');

      expect(mockPrisma.projectMember.delete).toHaveBeenCalledWith({
        where: {
          projectId_userId: {
            projectId: 'project-1',
            userId: 'user-1',
          },
        },
      });
    });
  });

  describe('countOwners', () => {
    it('should return count of OWNER members', async () => {
      const repository = createRepository();

      mockPrisma.projectMember.count.mockResolvedValue(2);

      const result = await repository.countOwners('project-1');

      expect(mockPrisma.projectMember.count).toHaveBeenCalledWith({
        where: {
          projectId: 'project-1',
          role: 'OWNER',
        },
      });
      expect(result).toBe(2);
    });

    it('should return 0 when no owners', async () => {
      const repository = createRepository();

      mockPrisma.projectMember.count.mockResolvedValue(0);

      const result = await repository.countOwners('project-1');

      expect(result).toBe(0);
    });
  });

  describe('addMember', () => {
    it('should create new membership record', async () => {
      const repository = createRepository();

      const newMember = {
        userId: 'user-1',
        role: 'DEVELOPER' as ProjectRole,
        createdAt: new Date('2024-01-01'),
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null },
      };

      mockPrisma.projectMember.create.mockResolvedValue(newMember);

      const result = await repository.addMember('project-1', 'user-1', 'DEVELOPER');

      expect(mockPrisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          userId: 'user-1',
          role: 'DEVELOPER',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });
      expect(result).toEqual(newMember);
    });
  });

  describe('findUserByEmail', () => {
    it('should return user when found', async () => {
      const repository = createRepository();

      const mockUser = { id: 'user-1', email: 'alice@example.com' };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findUserByEmail('alice@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
        select: { id: true, email: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      const repository = createRepository();

      const mockUser = { id: 'user-1', email: 'alice@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findUserById('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true, email: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findUserById('nonexistent-user');

      expect(result).toBeNull();
    });
  });
});
