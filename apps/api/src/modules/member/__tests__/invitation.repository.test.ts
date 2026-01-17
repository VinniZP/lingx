/**
 * InvitationRepository Unit Tests
 *
 * Tests data access methods for project invitation operations.
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationRepository } from '../repositories/invitation.repository.js';

describe('InvitationRepository', () => {
  const mockPrisma = {
    projectInvitation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };

  const createRepository = () => new InvitationRepository(mockPrisma as unknown as PrismaClient);

  const now = new Date('2024-01-15T12:00:00Z');
  const futureDate = new Date('2024-01-22T12:00:00Z'); // 7 days later

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('findPendingByProject', () => {
    it('should return pending invitations with project and inviter details', async () => {
      const repository = createRepository();

      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'alice@example.com',
          role: 'DEVELOPER' as ProjectRole,
          token: 'token-1',
          expiresAt: futureDate,
          createdAt: now,
          project: { id: 'proj-1', name: 'My Project', slug: 'my-project' },
          invitedBy: { id: 'user-1', name: 'Bob', email: 'bob@example.com' },
        },
      ];

      mockPrisma.projectInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await repository.findPendingByProject('proj-1');

      expect(mockPrisma.projectInvitation.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 'proj-1',
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        include: {
          project: { select: { id: true, name: true, slug: true } },
          invitedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('alice@example.com');
    });

    it('should return empty array when no pending invitations', async () => {
      const repository = createRepository();

      mockPrisma.projectInvitation.findMany.mockResolvedValue([]);

      const result = await repository.findPendingByProject('proj-1');

      expect(result).toEqual([]);
    });
  });

  describe('findByToken', () => {
    it('should return invitation with project and inviter details when found', async () => {
      const repository = createRepository();

      const mockInvitation = {
        id: 'inv-1',
        email: 'alice@example.com',
        role: 'DEVELOPER' as ProjectRole,
        token: 'secure-token',
        expiresAt: futureDate,
        acceptedAt: null,
        revokedAt: null,
        createdAt: now,
        project: { id: 'proj-1', name: 'My Project', slug: 'my-project' },
        invitedBy: { id: 'user-1', name: 'Bob', email: 'bob@example.com' },
      };

      mockPrisma.projectInvitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await repository.findByToken('secure-token');

      expect(mockPrisma.projectInvitation.findUnique).toHaveBeenCalledWith({
        where: { token: 'secure-token' },
        include: {
          project: { select: { id: true, name: true, slug: true } },
          invitedBy: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should return null when invitation not found', async () => {
      const repository = createRepository();

      mockPrisma.projectInvitation.findUnique.mockResolvedValue(null);

      const result = await repository.findByToken('nonexistent-token');

      expect(result).toBeNull();
    });
  });

  describe('findPendingByEmail', () => {
    it('should return pending invitation for email in project', async () => {
      const repository = createRepository();

      const mockInvitation = {
        id: 'inv-1',
        email: 'alice@example.com',
        role: 'DEVELOPER' as ProjectRole,
        token: 'token-1',
        expiresAt: futureDate,
        createdAt: now,
        project: { id: 'proj-1', name: 'My Project', slug: 'my-project' },
        invitedBy: { id: 'user-1', name: 'Bob', email: 'bob@example.com' },
      };

      mockPrisma.projectInvitation.findFirst.mockResolvedValue(mockInvitation);

      const result = await repository.findPendingByEmail('proj-1', 'alice@example.com');

      expect(mockPrisma.projectInvitation.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 'proj-1',
          email: 'alice@example.com',
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        include: {
          project: { select: { id: true, name: true, slug: true } },
          invitedBy: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should return null when no pending invitation exists', async () => {
      const repository = createRepository();

      mockPrisma.projectInvitation.findFirst.mockResolvedValue(null);

      const result = await repository.findPendingByEmail('proj-1', 'new@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new invitation', async () => {
      const repository = createRepository();

      const newInvitation = {
        id: 'inv-1',
        projectId: 'proj-1',
        email: 'alice@example.com',
        role: 'DEVELOPER' as ProjectRole,
        token: 'secure-token',
        invitedById: 'user-1',
        expiresAt: futureDate,
        createdAt: now,
        project: { id: 'proj-1', name: 'My Project', slug: 'my-project' },
        invitedBy: { id: 'user-1', name: 'Bob', email: 'bob@example.com' },
      };

      mockPrisma.projectInvitation.create.mockResolvedValue(newInvitation);

      const result = await repository.create({
        projectId: 'proj-1',
        email: 'alice@example.com',
        role: 'DEVELOPER',
        token: 'secure-token',
        invitedById: 'user-1',
        expiresAt: futureDate,
      });

      expect(mockPrisma.projectInvitation.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          email: 'alice@example.com',
          role: 'DEVELOPER',
          token: 'secure-token',
          invitedById: 'user-1',
          expiresAt: futureDate,
        },
        include: {
          project: { select: { id: true, name: true, slug: true } },
          invitedBy: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result.id).toBe('inv-1');
    });
  });

  describe('markAccepted', () => {
    it('should set acceptedAt timestamp', async () => {
      const repository = createRepository();

      mockPrisma.projectInvitation.update.mockResolvedValue({
        id: 'inv-1',
        acceptedAt: now,
      });

      await repository.markAccepted('inv-1');

      expect(mockPrisma.projectInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { acceptedAt: now },
      });
    });
  });

  describe('markRevoked', () => {
    it('should set revokedAt timestamp', async () => {
      const repository = createRepository();

      mockPrisma.projectInvitation.update.mockResolvedValue({
        id: 'inv-1',
        revokedAt: now,
      });

      await repository.markRevoked('inv-1');

      expect(mockPrisma.projectInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { revokedAt: now },
      });
    });
  });

  describe('countRecentByProject', () => {
    it('should count invitations created after given date', async () => {
      const repository = createRepository();
      const oneHourAgo = new Date('2024-01-15T11:00:00Z');

      mockPrisma.projectInvitation.count.mockResolvedValue(15);

      const result = await repository.countRecentByProject('proj-1', oneHourAgo);

      expect(mockPrisma.projectInvitation.count).toHaveBeenCalledWith({
        where: {
          projectId: 'proj-1',
          createdAt: { gte: oneHourAgo },
        },
      });
      expect(result).toBe(15);
    });
  });

  describe('countRecentByUser', () => {
    it('should count invitations sent by user after given date', async () => {
      const repository = createRepository();
      const oneDayAgo = new Date('2024-01-14T12:00:00Z');

      mockPrisma.projectInvitation.count.mockResolvedValue(30);

      const result = await repository.countRecentByUser('user-1', oneDayAgo);

      expect(mockPrisma.projectInvitation.count).toHaveBeenCalledWith({
        where: {
          invitedById: 'user-1',
          createdAt: { gte: oneDayAgo },
        },
      });
      expect(result).toBe(30);
    });
  });

  describe('findById', () => {
    it('should return invitation by ID with details', async () => {
      const repository = createRepository();

      const mockInvitation = {
        id: 'inv-1',
        projectId: 'proj-1',
        email: 'alice@example.com',
        role: 'DEVELOPER' as ProjectRole,
        project: { id: 'proj-1', name: 'My Project', slug: 'my-project' },
        invitedBy: { id: 'user-1', name: 'Bob', email: 'bob@example.com' },
      };

      mockPrisma.projectInvitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await repository.findById('inv-1');

      expect(mockPrisma.projectInvitation.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        include: {
          project: { select: { id: true, name: true, slug: true } },
          invitedBy: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result).toEqual(mockInvitation);
    });
  });
});
