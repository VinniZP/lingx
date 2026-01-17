/**
 * AdminRepository Unit Tests
 *
 * Tests data access methods for admin user management operations.
 */

import type { PrismaClient, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRepository } from '../repositories/admin.repository.js';

describe('AdminRepository', () => {
  const mockPrisma = {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
    },
  };

  const createRepository = () => new AdminRepository(mockPrisma as unknown as PrismaClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAllUsers', () => {
    it('should return paginated users with project counts', async () => {
      const repository = createRepository();

      const mockUsers = [
        {
          id: 'user-1',
          email: 'alice@example.com',
          name: 'Alice',
          avatarUrl: null,
          role: 'DEVELOPER' as Role,
          isDisabled: false,
          disabledAt: null,
          createdAt: new Date('2024-01-01'),
          _count: { projectMembers: 3 },
        },
        {
          id: 'user-2',
          email: 'bob@example.com',
          name: 'Bob',
          avatarUrl: 'https://...',
          role: 'ADMIN' as Role,
          isDisabled: true,
          disabledAt: new Date('2024-06-01'),
          createdAt: new Date('2024-02-01'),
          _count: { projectMembers: 5 },
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(50);

      const result = await repository.findAllUsers({}, { page: 1, limit: 50 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isDisabled: true,
          disabledAt: true,
          createdAt: true,
          _count: {
            select: { projectMembers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
      expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: {} });
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by role', async () => {
      const repository = createRepository();

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await repository.findAllUsers({ role: 'ADMIN' }, { page: 1, limit: 50 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'ADMIN' },
        })
      );
    });

    it('should filter by status (active)', async () => {
      const repository = createRepository();

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await repository.findAllUsers({ status: 'active' }, { page: 1, limit: 50 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDisabled: false },
        })
      );
    });

    it('should filter by status (disabled)', async () => {
      const repository = createRepository();

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await repository.findAllUsers({ status: 'disabled' }, { page: 1, limit: 50 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDisabled: true },
        })
      );
    });

    it('should filter by search term (name or email)', async () => {
      const repository = createRepository();

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await repository.findAllUsers({ search: 'alice' }, { page: 1, limit: 50 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'alice', mode: 'insensitive' } },
              { email: { contains: 'alice', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should combine multiple filters', async () => {
      const repository = createRepository();

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await repository.findAllUsers(
        { role: 'DEVELOPER', status: 'active', search: 'test' },
        { page: 2, limit: 25 }
      );

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: 'DEVELOPER',
            isDisabled: false,
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ],
          },
          skip: 25,
          take: 25,
        })
      );
    });

    it('should return empty array when no users match', async () => {
      const repository = createRepository();

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await repository.findAllUsers({}, { page: 1, limit: 50 });

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findUserById', () => {
    it('should return user with projects and disabledBy info', async () => {
      const repository = createRepository();

      const mockUser = {
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        avatarUrl: null,
        role: 'DEVELOPER' as Role,
        isDisabled: true,
        disabledAt: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
        disabledBy: {
          id: 'admin-1',
          name: 'Admin',
          email: 'admin@example.com',
        },
        projectMembers: [
          {
            role: 'OWNER',
            project: { id: 'project-1', name: 'Project 1', slug: 'project-1' },
          },
          {
            role: 'DEVELOPER',
            project: { id: 'project-2', name: 'Project 2', slug: 'project-2' },
          },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findUserById('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isDisabled: true,
          disabledAt: true,
          createdAt: true,
          disabledBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectMembers: {
            select: {
              role: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
      expect(result).toBeDefined();
      expect(result?.id).toBe('user-1');
      expect(result?.disabledBy?.id).toBe('admin-1');
      expect(result?.projectMembers).toHaveLength(2);
    });

    it('should return null when user not found', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findUserActivity', () => {
    it('should return recent activity entries for user', async () => {
      const repository = createRepository();

      const mockActivities = [
        {
          id: 'activity-1',
          projectId: 'project-1',
          type: 'TRANSLATION_UPDATED',
          metadata: { summary: 'Updated 5 translations' },
          count: 5,
          createdAt: new Date('2024-06-15'),
          project: { id: 'project-1', name: 'Project 1', slug: 'project-1' },
        },
        {
          id: 'activity-2',
          projectId: 'project-2',
          type: 'KEY_CREATED',
          metadata: { summary: 'Created 2 keys' },
          count: 2,
          createdAt: new Date('2024-06-14'),
          project: { id: 'project-2', name: 'Project 2', slug: 'project-2' },
        },
      ];

      mockPrisma.activity.findMany.mockResolvedValue(mockActivities);

      const result = await repository.findUserActivity('user-1', 50);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: {
          id: true,
          projectId: true,
          type: true,
          metadata: true,
          count: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no activity', async () => {
      const repository = createRepository();

      mockPrisma.activity.findMany.mockResolvedValue([]);

      const result = await repository.findUserActivity('user-1', 50);

      expect(result).toEqual([]);
    });
  });

  describe('updateUserDisabled', () => {
    it('should disable user with disabledBy reference', async () => {
      const repository = createRepository();

      const mockUpdatedUser = {
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'DEVELOPER' as Role,
        isDisabled: true,
        disabledAt: new Date('2024-06-15'),
        disabledById: 'admin-1',
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await repository.updateUserDisabled('user-1', true, 'admin-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          isDisabled: true,
          disabledAt: expect.any(Date),
          disabledById: 'admin-1',
        },
      });
      expect(result.isDisabled).toBe(true);
    });

    it('should enable user and clear disabled fields', async () => {
      const repository = createRepository();

      const mockUpdatedUser = {
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'DEVELOPER' as Role,
        isDisabled: false,
        disabledAt: null,
        disabledById: null,
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await repository.updateUserDisabled('user-1', false);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          isDisabled: false,
          disabledAt: null,
          disabledById: null,
        },
      });
      expect(result.isDisabled).toBe(false);
    });
  });

  describe('anonymizeUserActivity', () => {
    it('should merge actorName into existing activity metadata', async () => {
      const repository = createRepository();

      // Mock finding activities with existing metadata
      mockPrisma.activity.findMany.mockResolvedValue([
        { id: 'act-1', metadata: { keyName: 'greeting', oldValue: 'hi' } },
        { id: 'act-2', metadata: { keyName: 'farewell' } },
        { id: 'act-3', metadata: null },
      ]);
      mockPrisma.activity.update.mockResolvedValue({});

      await repository.anonymizeUserActivity('user-1');

      // Should fetch activities first
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { id: true, metadata: true },
      });

      // Should update each activity with merged metadata
      expect(mockPrisma.activity.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'act-1' },
        data: { metadata: { keyName: 'greeting', oldValue: 'hi', actorName: 'Deleted User' } },
      });
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'act-2' },
        data: { metadata: { keyName: 'farewell', actorName: 'Deleted User' } },
      });
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'act-3' },
        data: { metadata: { actorName: 'Deleted User' } },
      });
    });

    it('should handle empty activity list', async () => {
      const repository = createRepository();

      mockPrisma.activity.findMany.mockResolvedValue([]);

      await repository.anonymizeUserActivity('user-1');

      expect(mockPrisma.activity.findMany).toHaveBeenCalled();
      expect(mockPrisma.activity.update).not.toHaveBeenCalled();
    });
  });

  describe('getLastActiveAt', () => {
    it('should return most recent session lastActive', async () => {
      const repository = createRepository();

      mockPrisma.session.findFirst.mockResolvedValue({
        lastActive: new Date('2024-06-15T10:00:00Z'),
      });

      const result = await repository.getLastActiveAt('user-1');

      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { lastActive: true },
        orderBy: { lastActive: 'desc' },
      });
      expect(result).toEqual(new Date('2024-06-15T10:00:00Z'));
    });

    it('should return null when no sessions', async () => {
      const repository = createRepository();

      mockPrisma.session.findFirst.mockResolvedValue(null);

      const result = await repository.getLastActiveAt('user-1');

      expect(result).toBeNull();
    });
  });

  describe('findUserRoleById', () => {
    it('should return user role when user exists', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });

      const result = await repository.findUserRoleById('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { role: true },
      });
      expect(result).toBe('ADMIN');
    });

    it('should return null when user not found', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findUserRoleById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return DEVELOPER role correctly', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue({ role: 'DEVELOPER' });

      const result = await repository.findUserRoleById('user-2');

      expect(result).toBe('DEVELOPER');
    });
  });

  describe('isUserDisabled', () => {
    it('should return true when user is disabled', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue({ isDisabled: true });

      const result = await repository.isUserDisabled('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { isDisabled: true },
      });
      expect(result).toBe(true);
    });

    it('should return false when user is active', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue({ isDisabled: false });

      const result = await repository.isUserDisabled('user-2');

      expect(result).toBe(false);
    });

    it('should return null when user not found', async () => {
      const repository = createRepository();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.isUserDisabled('nonexistent');

      expect(result).toBeNull();
    });
  });
});
