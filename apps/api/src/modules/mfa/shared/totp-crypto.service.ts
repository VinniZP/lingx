/**
 * TOTP Crypto Service
 *
 * Pure cryptographic utilities for TOTP operations.
 * Handles encryption, decryption, token verification, and backup code management.
 */
import bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { authenticator } from 'otplib';

import {
  BACKUP_CODE_COUNT,
  BACKUP_CODE_LENGTH,
  BCRYPT_ROUNDS,
  TOTP_APP_NAME,
} from './constants.js';

/** Auth tag length in hex characters (16 bytes = 32 hex chars) */
const AUTH_TAG_HEX_LENGTH = 32;

export interface EncryptedSecret {
  encrypted: string;
  iv: string;
}

export class TotpCryptoService {
  // ============================================
  // TOTP Secret Operations
  // ============================================

  /**
   * Generate a new TOTP secret
   */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Verify a TOTP token against a secret
   */
  verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }

  /**
   * Generate a QR code URI for authenticator apps
   */
  generateQrCodeUri(email: string, secret: string): string {
    return authenticator.keyuri(email, TOTP_APP_NAME, secret);
  }

  // ============================================
  // Encryption Operations
  // ============================================

  /**
   * Encrypt TOTP secret using AES-256-GCM
   */
  encryptSecret(secret: string): EncryptedSecret {
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
  decryptSecret(encrypted: string, ivHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');

    // Split encrypted data and auth tag
    const authTag = Buffer.from(encrypted.slice(-AUTH_TAG_HEX_LENGTH), 'hex');
    const encryptedData = encrypted.slice(0, -AUTH_TAG_HEX_LENGTH);

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
  // Backup Codes
  // ============================================

  /**
   * Generate random backup codes
   */
  generateBackupCodes(): string[] {
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
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => bcrypt.hash(code, BCRYPT_ROUNDS)));
  }

  /**
   * Verify a backup code against a hash
   */
  async verifyBackupCode(code: string, hash: string): Promise<boolean> {
    // Normalize input code (uppercase, no spaces)
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');
    return bcrypt.compare(normalizedCode, hash);
  }

  // ============================================
  // Password Verification
  // ============================================

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
