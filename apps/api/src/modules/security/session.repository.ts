/**
 * Session Repository
 *
 * Data access layer for session operations.
 * Encapsulates all Prisma queries for the session domain.
 */
import type { PrismaClient, Session } from '@prisma/client';

/** Session expiry duration (24 hours, matches JWT) */
export const SESSION_EXPIRY_HOURS = 24;

/**
 * Input for creating a session.
 */
export interface CreateSessionInput {
  userId: string;
  userAgent: string | null;
  deviceInfo: string | null;
  ipAddress: string | null;
}

/**
 * Session info for API responses.
 * Contains masked IP address and isCurrent flag.
 */
export interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export class SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new session.
   */
  async create(input: CreateSessionInput): Promise<Session> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    return this.prisma.session.create({
      data: {
        userId: input.userId,
        userAgent: input.userAgent,
        deviceInfo: input.deviceInfo,
        ipAddress: input.ipAddress,
        expiresAt,
      },
    });
  }

  /**
   * Find session by ID.
   */
  async findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  /**
   * Find session by ID if not expired.
   * Returns null if session doesn't exist or is expired.
   */
  async findValidById(id: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      return null;
    }

    return session;
  }

  /**
   * Update session last activity timestamp.
   * Throws if session not found or database error occurs.
   */
  async updateLastActive(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { lastActive: new Date() },
    });
  }

  /**
   * Find all active sessions for a user.
   */
  async findByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActive: 'desc' },
    });
  }

  /**
   * Find session by ID and verify ownership.
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Delete a session.
   * Returns true if deleted, false if not found.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.session.delete({ where: { id } });
      return true;
    } catch (err) {
      // P2025 = Record not found
      const isPrismaNotFound =
        err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025';
      if (isPrismaNotFound) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Delete all sessions for a user except the specified one.
   * Returns the count of deleted sessions.
   */
  async deleteAllExcept(userId: string, exceptSessionId: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        userId,
        id: { not: exceptSessionId },
      },
    });
    return result.count;
  }

  /**
   * Delete all sessions for a user.
   * Returns the count of deleted sessions.
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  /**
   * Delete all expired sessions.
   * Returns the count of deleted sessions.
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
