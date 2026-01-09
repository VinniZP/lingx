/**
 * TOTP Repository
 *
 * Data access layer for TOTP-related operations.
 * Abstracts Prisma operations for TOTP, backup codes, and device trust.
 */
import type { PrismaClient } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface UserWithTotp {
  id: string;
  email: string;
  password: string | null;
  totpEnabled: boolean;
  totpSecret: string | null;
  totpSecretIv: string | null;
  totpEnabledAt: Date | null;
  totpFailedAttempts: number;
  totpLockedUntil: Date | null;
}

export interface BackupCodeRecord {
  id: string;
  userId: string;
  codeHash: string;
  usedAt: Date | null;
}

export interface TotpSetupData {
  encryptedSecret: string;
  secretIv: string;
  backupCodeHashes: string[];
}

// ============================================
// Repository
// ============================================

export class TotpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================
  // User Operations
  // ============================================

  /**
   * Find user by ID with TOTP-related fields
   */
  async findUserById(userId: string): Promise<UserWithTotp | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  // ============================================
  // TOTP Setup Operations
  // ============================================

  /**
   * Save TOTP setup (secret + backup codes) without enabling
   */
  async saveTotpSetup(userId: string, data: TotpSetupData): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete any existing backup codes
      await tx.backupCode.deleteMany({ where: { userId } });

      // Update user with encrypted secret (not enabled yet)
      await tx.user.update({
        where: { id: userId },
        data: {
          totpSecret: data.encryptedSecret,
          totpSecretIv: data.secretIv,
          totpEnabled: false,
          totpEnabledAt: null,
        },
      });

      // Create backup codes
      await tx.backupCode.createMany({
        data: data.backupCodeHashes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      });
    });
  }

  /**
   * Enable TOTP for user (after verification)
   */
  async enableTotp(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: true,
        totpEnabledAt: new Date(),
        totpFailedAttempts: 0,
        totpLockedUntil: null,
      },
    });
  }

  /**
   * Disable TOTP and clean up all related data
   */
  async disableTotp(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete backup codes
      await tx.backupCode.deleteMany({ where: { userId } });

      // Clear TOTP data
      await tx.user.update({
        where: { id: userId },
        data: {
          totpSecret: null,
          totpSecretIv: null,
          totpEnabled: false,
          totpEnabledAt: null,
          totpFailedAttempts: 0,
          totpLockedUntil: null,
        },
      });

      // Revoke all device trust
      await tx.session.updateMany({
        where: { userId },
        data: { trustedUntil: null },
      });
    });
  }

  /**
   * Clear pending TOTP setup (when user cancels)
   */
  async clearTotpSetup(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.backupCode.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          totpSecret: null,
          totpSecretIv: null,
        },
      });
    });
  }

  // ============================================
  // Backup Codes
  // ============================================

  /**
   * Get all unused backup codes for a user
   */
  async getUnusedBackupCodes(userId: string): Promise<BackupCodeRecord[]> {
    return this.prisma.backupCode.findMany({
      where: { userId, usedAt: null },
    });
  }

  /**
   * Mark a backup code as used
   */
  async markBackupCodeUsed(codeId: string): Promise<void> {
    await this.prisma.backupCode.update({
      where: { id: codeId },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Count unused backup codes
   */
  async countUnusedBackupCodes(userId: string): Promise<number> {
    return this.prisma.backupCode.count({
      where: { userId, usedAt: null },
    });
  }

  /**
   * Replace all backup codes with new ones
   */
  async replaceBackupCodes(userId: string, hashedCodes: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.backupCode.deleteMany({ where: { userId } });
      await tx.backupCode.createMany({
        data: hashedCodes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      });
    });
  }

  // ============================================
  // Rate Limiting
  // ============================================

  /**
   * Update failed attempts count and optional lockout
   */
  async incrementFailedAttempts(
    userId: string,
    attempts: number,
    lockedUntil: Date | null
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpFailedAttempts: attempts,
        totpLockedUntil: lockedUntil,
      },
    });
  }

  /**
   * Reset failed attempts after successful verification
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpFailedAttempts: 0,
        totpLockedUntil: null,
      },
    });
  }

  // ============================================
  // Device Trust
  // ============================================

  /**
   * Get session trust status
   */
  async getSessionTrust(sessionId: string): Promise<{ trustedUntil: Date | null } | null> {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { trustedUntil: true },
    });
  }

  /**
   * Set device trust for a session
   */
  async setSessionTrust(sessionId: string, trustedUntil: Date): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { trustedUntil },
    });
  }

  /**
   * Revoke trust for a specific session
   */
  async revokeSessionTrust(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { trustedUntil: null },
    });
  }

  /**
   * Count trusted sessions for a user
   */
  async countTrustedSessions(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        trustedUntil: { gt: new Date() },
      },
    });
  }
}
