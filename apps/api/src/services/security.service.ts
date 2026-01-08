/**
 * Security Service
 *
 * Handles password changes and session management.
 * Sessions track login activity and enable "revoke all sessions" functionality.
 */
import { PrismaClient, Session } from '@prisma/client';
import bcrypt from 'bcrypt';
import { FastifyRequest } from 'fastify';
import {
  BadRequestError,
  FieldValidationError,
  UnauthorizedError,
} from '../plugins/error-handler.js';

/** bcrypt cost factor per Design Doc NFRs */
const BCRYPT_ROUNDS = 12;

/** Session expiry duration (24 hours, matches JWT) */
const SESSION_EXPIRY_HOURS = 24;

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export class SecurityService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Create a new session for a user
   *
   * @param userId - User ID
   * @param request - Fastify request (for device info extraction)
   * @returns Created session
   */
  async createSession(userId: string, request: FastifyRequest): Promise<Session> {
    const userAgent = request.headers['user-agent'] || null;
    const deviceInfo = userAgent ? this.parseUserAgent(userAgent) : null;
    const ipAddress = this.getClientIp(request);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    return this.prisma.session.create({
      data: {
        userId,
        userAgent,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });
  }

  /**
   * Validate a session exists and is not expired
   *
   * @param sessionId - Session ID from JWT
   * @returns true if valid, false otherwise
   */
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return false;
    }

    // Check expiry
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      return false;
    }

    return true;
  }

  /**
   * Update session last activity timestamp
   *
   * @param sessionId - Session ID
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.prisma.session
      .update({
        where: { id: sessionId },
        data: { lastActive: new Date() },
      })
      .catch(() => {
        // Ignore errors - session might be deleted
      });
  }

  /**
   * Get all active sessions for a user
   *
   * @param userId - User ID
   * @param currentSessionId - Current session ID for "isCurrent" flag
   * @returns Array of session info
   */
  async getSessions(userId: string, currentSessionId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActive: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: this.maskIpAddress(session.ipAddress),
      lastActive: session.lastActive.toISOString(),
      createdAt: session.createdAt.toISOString(),
      isCurrent: session.id === currentSessionId,
    }));
  }

  /**
   * Revoke a specific session
   *
   * @param userId - User ID (for ownership verification)
   * @param sessionId - Session to revoke
   * @param currentSessionId - Current session ID (cannot revoke current)
   */
  async revokeSession(userId: string, sessionId: string, currentSessionId: string): Promise<void> {
    // Cannot revoke current session (use logout instead)
    if (sessionId === currentSessionId) {
      throw new BadRequestError('Cannot revoke current session. Use logout instead.');
    }

    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new BadRequestError('Session not found');
    }

    await this.prisma.session.delete({ where: { id: sessionId } });
  }

  /**
   * Revoke all sessions except current
   *
   * @param userId - User ID
   * @param currentSessionId - Current session to keep
   * @returns Number of sessions revoked
   */
  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        userId,
        id: { not: currentSessionId },
      },
    });

    return result.count;
  }

  /**
   * Delete a session (for logout)
   *
   * @param sessionId - Session to delete
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.prisma.session.delete({ where: { id: sessionId } });
    } catch (err) {
      // P2025 = Record not found - session already deleted, this is expected
      const isPrismaNotFound =
        err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025';
      if (!isPrismaNotFound) {
        throw err;
      }
    }
  }

  /**
   * Clean up expired sessions (for periodic maintenance)
   *
   * @returns Number of sessions deleted
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return result.count;
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  /**
   * Change user password
   *
   * Validates current password, updates to new password,
   * revokes all other sessions, and creates a new session.
   *
   * @param userId - User ID
   * @param currentSessionId - Current session ID
   * @param input - Current and new password
   * @param request - Fastify request (for new session creation)
   * @returns New session ID
   */
  async changePassword(
    userId: string,
    _currentSessionId: string,
    input: ChangePasswordInput,
    request: FastifyRequest
  ): Promise<{ newSessionId: string }> {
    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user is passwordless
    if (!user.password) {
      throw new BadRequestError(
        'You are passwordless and cannot change your password. Add a password first.'
      );
    }

    // Validate current password
    const isValid = await bcrypt.compare(input.currentPassword, user.password);
    if (!isValid) {
      throw new FieldValidationError(
        [
          {
            field: 'currentPassword',
            message: 'Current password is incorrect',
            code: 'INVALID_PASSWORD',
          },
        ],
        'Invalid current password'
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

    // Update password and revoke all sessions in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Delete all sessions for this user
      await tx.session.deleteMany({
        where: { userId },
      });
    });

    // Create new session for current device
    const newSession = await this.createSession(userId, request);

    return { newSessionId: newSession.id };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Parse user agent string into readable device info
   */
  private parseUserAgent(userAgent: string): string {
    // Simple parsing - extract browser and OS
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect browser
    if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Edg/')) {
      browser = 'Edge';
    } else if (userAgent.includes('Chrome/')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    }

    // Detect OS
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    return `${browser} on ${os}`;
  }

  /**
   * Get client IP from request
   */
  private getClientIp(request: FastifyRequest): string | null {
    // Check for forwarded IP (behind proxy)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
      return ips[0].trim();
    }

    return request.ip || null;
  }

  /**
   * Mask IP address for privacy (hide last octet)
   */
  private maskIpAddress(ip: string | null): string | null {
    if (!ip) return null;

    // IPv4: 192.168.1.xxx
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[3] = 'xxx';
        return parts.join('.');
      }
    }

    // IPv6: just show first few groups
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length > 4) {
        return parts.slice(0, 4).join(':') + ':...';
      }
    }

    return ip;
  }
}
