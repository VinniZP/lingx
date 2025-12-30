/**
 * TOTP Service
 *
 * Handles Two-Factor Authentication using TOTP (Time-based One-Time Passwords).
 * Supports Google Authenticator, Authy, and similar apps.
 */
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import {
  UnauthorizedError,
  BadRequestError,
  FieldValidationError,
} from '../plugins/error-handler.js';

/** bcrypt cost factor for backup code hashing */
const BCRYPT_ROUNDS = 12;

/** Number of backup codes to generate */
const BACKUP_CODE_COUNT = 10;

/** Length of each backup code (uppercase alphanumeric) */
const BACKUP_CODE_LENGTH = 8;

/** Device trust duration in days */
const DEVICE_TRUST_DAYS = 30;

/** Maximum failed TOTP attempts before lockout */
const MAX_FAILED_ATTEMPTS = 5;

/** Lockout duration in minutes */
const LOCKOUT_MINUTES = 15;

/** App name shown in authenticator apps */
const APP_NAME = 'LocaleFlow';

export interface TotpSetupResult {
  secret: string; // Base32 encoded for manual entry
  qrCodeUri: string; // otpauth:// URI for QR code
  backupCodes: string[]; // Plaintext codes (shown once)
}

export interface TotpStatus {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
  trustedDevicesCount: number;
}

export class TotpService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // SETUP FLOW
  // ============================================

  /**
   * Initiate TOTP setup - generates secret and backup codes
   *
   * Does NOT enable TOTP yet - user must verify with confirmSetup()
   */
  async initiateSetup(userId: string): Promise<TotpSetupResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled');
    }

    // Generate new TOTP secret
    const secret = authenticator.generateSecret();

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Hash backup codes for storage
    const hashedCodes = await this.hashBackupCodes(backupCodes);

    // Encrypt the secret
    const { encrypted, iv } = this.encryptSecret(secret);

    // Store encrypted secret and backup codes (NOT enabled yet)
    await this.prisma.$transaction(async (tx) => {
      // Delete any existing backup codes
      await tx.backupCode.deleteMany({ where: { userId } });

      // Update user with encrypted secret (not enabled)
      await tx.user.update({
        where: { id: userId },
        data: {
          totpSecret: encrypted,
          totpSecretIv: iv,
          totpEnabled: false,
          totpEnabledAt: null,
        },
      });

      // Create backup codes
      await tx.backupCode.createMany({
        data: hashedCodes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      });
    });

    // Generate QR code URI
    const qrCodeUri = authenticator.keyuri(user.email, APP_NAME, secret);

    return {
      secret, // User can manually enter this
      qrCodeUri, // For QR code generation on frontend
      backupCodes, // Shown only once
    };
  }

  /**
   * Confirm TOTP setup by verifying a token
   *
   * This actually enables TOTP for the user
   */
  async confirmSetup(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled');
    }

    if (!user.totpSecret || !user.totpSecretIv) {
      throw new BadRequestError('Please initiate setup first');
    }

    // Decrypt and verify the token
    const secret = this.decryptSecret(user.totpSecret, user.totpSecretIv);
    const isValid = authenticator.verify({ token, secret });

    if (!isValid) {
      throw new FieldValidationError(
        [{ field: 'token', message: 'Invalid verification code', code: 'INVALID_TOKEN' }],
        'Invalid verification code'
      );
    }

    // Enable TOTP
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: true,
        totpEnabledAt: new Date(),
        totpFailedAttempts: 0,
        totpLockedUntil: null,
      },
    });

    // Return backup codes (already generated during initiateSetup)
    const backupCodes = await this.prisma.backupCode.findMany({
      where: { userId, usedAt: null },
    });

    // Note: We can't return the actual codes since they're hashed
    // The frontend should have saved them from initiateSetup
    return { backupCodes: backupCodes.map(() => '********') };
  }

  /**
   * Cancel pending TOTP setup
   */
  async cancelSetup(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestError('Cannot cancel - 2FA is already enabled');
    }

    // Clear pending setup data
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
  // VERIFICATION
  // ============================================

  /**
   * Verify TOTP token during login
   */
  async verifyTotp(
    userId: string,
    token: string,
    sessionId?: string,
    trustDevice?: boolean
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled || !user.totpSecret || !user.totpSecretIv) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    // Check lockout
    await this.checkRateLimit(user);

    // Decrypt and verify
    const secret = this.decryptSecret(user.totpSecret, user.totpSecretIv);
    const isValid = authenticator.verify({ token, secret });

    if (!isValid) {
      await this.incrementFailedAttempts(userId);
      throw new FieldValidationError(
        [{ field: 'token', message: 'Invalid verification code', code: 'INVALID_TOKEN' }],
        'Invalid verification code'
      );
    }

    // Reset failed attempts on success
    await this.resetFailedAttempts(userId);

    // Trust device if requested
    if (trustDevice && sessionId) {
      await this.trustDevice(sessionId);
    }

    return { success: true };
  }

  /**
   * Verify and use a backup code during login
   */
  async verifyBackupCode(
    userId: string,
    code: string,
    sessionId?: string,
    trustDevice?: boolean
  ): Promise<{ success: boolean; codesRemaining: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    // Check lockout
    await this.checkRateLimit(user);

    // Get unused backup codes
    const backupCodes = await this.prisma.backupCode.findMany({
      where: { userId, usedAt: null },
    });

    // Normalize input code (uppercase, no spaces)
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');

    // Find matching code
    let matchedCodeId: string | null = null;
    for (const backupCode of backupCodes) {
      const isMatch = await bcrypt.compare(normalizedCode, backupCode.codeHash);
      if (isMatch) {
        matchedCodeId = backupCode.id;
        break;
      }
    }

    if (!matchedCodeId) {
      await this.incrementFailedAttempts(userId);
      throw new FieldValidationError(
        [{ field: 'code', message: 'Invalid backup code', code: 'INVALID_CODE' }],
        'Invalid backup code'
      );
    }

    // Mark code as used
    await this.prisma.backupCode.update({
      where: { id: matchedCodeId },
      data: { usedAt: new Date() },
    });

    // Reset failed attempts
    await this.resetFailedAttempts(userId);

    // Trust device if requested
    if (trustDevice && sessionId) {
      await this.trustDevice(sessionId);
    }

    // Count remaining codes
    const codesRemaining = backupCodes.length - 1;

    return { success: true, codesRemaining };
  }

  // ============================================
  // MANAGEMENT
  // ============================================

  /**
   * Disable TOTP (requires password verification)
   */
  async disable(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new FieldValidationError(
        [{ field: 'password', message: 'Incorrect password', code: 'INVALID_PASSWORD' }],
        'Incorrect password'
      );
    }

    // Disable TOTP and clean up
    await this.prisma.$transaction(async (tx) => {
      // Delete backup codes
      await tx.backupCode.deleteMany({ where: { userId } });

      // Clear TOTP data and revoke device trust
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
   * Regenerate backup codes (requires password verification)
   */
  async regenerateBackupCodes(userId: string, password: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new FieldValidationError(
        [{ field: 'password', message: 'Incorrect password', code: 'INVALID_PASSWORD' }],
        'Incorrect password'
      );
    }

    // Generate new codes
    const backupCodes = this.generateBackupCodes();
    const hashedCodes = await this.hashBackupCodes(backupCodes);

    // Replace old codes
    await this.prisma.$transaction(async (tx) => {
      await tx.backupCode.deleteMany({ where: { userId } });
      await tx.backupCode.createMany({
        data: hashedCodes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      });
    });

    return backupCodes;
  }

  /**
   * Get TOTP status for user
   */
  async getStatus(userId: string): Promise<TotpStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Count unused backup codes
    const backupCodesRemaining = await this.prisma.backupCode.count({
      where: { userId, usedAt: null },
    });

    // Count trusted devices
    const trustedDevicesCount = await this.prisma.session.count({
      where: {
        userId,
        trustedUntil: { gt: new Date() },
      },
    });

    return {
      enabled: user.totpEnabled,
      enabledAt: user.totpEnabledAt?.toISOString() ?? null,
      backupCodesRemaining,
      trustedDevicesCount,
    };
  }

  // ============================================
  // DEVICE TRUST
  // ============================================

  /**
   * Check if a session is trusted for 2FA bypass
   */
  async isDeviceTrusted(sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.trustedUntil) {
      return false;
    }

    return session.trustedUntil > new Date();
  }

  /**
   * Trust a device for 30 days
   */
  async trustDevice(sessionId: string): Promise<void> {
    const trustedUntil = new Date();
    trustedUntil.setDate(trustedUntil.getDate() + DEVICE_TRUST_DAYS);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { trustedUntil },
    }).catch(() => {
      // Session might not exist
    });
  }

  /**
   * Revoke trust for a specific device/session
   */
  async revokeTrust(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { trustedUntil: null },
    });
  }

  /**
   * Check if user has 2FA enabled
   */
  async hasTotpEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    });

    return user?.totpEnabled ?? false;
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  /**
   * Check if user is rate-limited
   */
  private async checkRateLimit(user: { totpLockedUntil: Date | null; totpFailedAttempts: number }): Promise<void> {
    if (user.totpLockedUntil && user.totpLockedUntil > new Date()) {
      const remainingMs = user.totpLockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new BadRequestError(
        `Too many failed attempts. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`
      );
    }
  }

  /**
   * Increment failed attempts and potentially lock account
   */
  private async incrementFailedAttempts(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpFailedAttempts: true },
    });

    const newAttempts = (user?.totpFailedAttempts ?? 0) + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

    const lockUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpFailedAttempts: newAttempts,
        totpLockedUntil: lockUntil,
      },
    });
  }

  /**
   * Reset failed attempts after successful verification
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpFailedAttempts: 0,
        totpLockedUntil: null,
      },
    });
  }

  // ============================================
  // ENCRYPTION
  // ============================================

  /**
   * Encrypt TOTP secret using AES-256-GCM
   */
  private encryptSecret(secret: string): { encrypted: string; iv: string } {
    const key = this.getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted + authTag.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt TOTP secret
   */
  private decryptSecret(encrypted: string, ivHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');

    // Split encrypted data and auth tag (last 32 hex chars = 16 bytes)
    const authTag = Buffer.from(encrypted.slice(-32), 'hex');
    const encryptedData = encrypted.slice(0, -32);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get encryption key from environment
   */
  private getEncryptionKey(): Buffer {
    const keyHex = process.env.TOTP_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32'
      );
    }
    return Buffer.from(keyHex, 'hex');
  }

  // ============================================
  // BACKUP CODES
  // ============================================

  /**
   * Generate random backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      let code = '';
      const bytes = randomBytes(BACKUP_CODE_LENGTH);
      for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
        code += chars[bytes[j] % chars.length];
      }
      codes.push(code);
    }

    return codes;
  }

  /**
   * Hash backup codes for secure storage
   */
  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => bcrypt.hash(code, BCRYPT_ROUNDS)));
  }
}
