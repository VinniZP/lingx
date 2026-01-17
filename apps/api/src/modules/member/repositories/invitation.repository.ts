/**
 * Invitation Repository
 *
 * Data access layer for project invitation operations.
 * Encapsulates all Prisma queries for invitation-related operations.
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';

/** Include clause for project and inviter details in invitation queries */
const invitationInclude = {
  project: { select: { id: true, name: true, slug: true } },
  invitedBy: { select: { id: true, name: true, email: true } },
} as const;

export interface InvitationWithDetails {
  id: string;
  email: string;
  role: ProjectRole;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  project: { id: string; name: string; slug: string };
  invitedBy: { id: string; name: string | null; email: string };
}

export interface CreateInvitationInput {
  projectId: string;
  email: string;
  role: ProjectRole;
  token: string;
  invitedById: string;
  expiresAt: Date;
}

export class InvitationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find all pending (not accepted, not revoked, not expired) invitations for a project.
   */
  async findPendingByProject(projectId: string): Promise<InvitationWithDetails[]> {
    const now = new Date();
    return this.prisma.projectInvitation.findMany({
      where: {
        projectId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: invitationInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find an invitation by its token.
   */
  async findByToken(token: string): Promise<InvitationWithDetails | null> {
    return this.prisma.projectInvitation.findUnique({
      where: { token },
      include: invitationInclude,
    });
  }

  /**
   * Find a pending invitation by email in a specific project.
   * Used to check for existing invitations before sending new ones.
   */
  async findPendingByEmail(
    projectId: string,
    email: string
  ): Promise<InvitationWithDetails | null> {
    const now = new Date();
    return this.prisma.projectInvitation.findFirst({
      where: {
        projectId,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: invitationInclude,
    });
  }

  /**
   * Find an invitation by ID.
   */
  async findById(id: string): Promise<InvitationWithDetails | null> {
    return this.prisma.projectInvitation.findUnique({
      where: { id },
      include: invitationInclude,
    });
  }

  /**
   * Create a new invitation.
   */
  async create(input: CreateInvitationInput): Promise<InvitationWithDetails> {
    return this.prisma.projectInvitation.create({
      data: {
        projectId: input.projectId,
        email: input.email,
        role: input.role,
        token: input.token,
        invitedById: input.invitedById,
        expiresAt: input.expiresAt,
      },
      include: invitationInclude,
    });
  }

  /**
   * Mark an invitation as accepted.
   */
  async markAccepted(id: string): Promise<void> {
    const now = new Date();
    await this.prisma.projectInvitation.update({
      where: { id },
      data: { acceptedAt: now },
    });
  }

  /**
   * Mark an invitation as revoked.
   */
  async markRevoked(id: string): Promise<void> {
    const now = new Date();
    await this.prisma.projectInvitation.update({
      where: { id },
      data: { revokedAt: now },
    });
  }

  /**
   * Count invitations created for a project after a given date.
   * Used for rate limiting (max 20 invites per project per hour).
   */
  async countRecentByProject(projectId: string, since: Date): Promise<number> {
    return this.prisma.projectInvitation.count({
      where: {
        projectId,
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Count invitations sent by a user after a given date.
   * Used for rate limiting (max 50 invites per user per day).
   */
  async countRecentByUser(userId: string, since: Date): Promise<number> {
    return this.prisma.projectInvitation.count({
      where: {
        invitedById: userId,
        createdAt: { gte: since },
      },
    });
  }
}
