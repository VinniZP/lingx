/**
 * MFA Module Constants
 *
 * Shared configuration values for TOTP and WebAuthn functionality.
 */

// ============================================
// TOTP Constants
// ============================================

/** bcrypt cost factor for backup code hashing */
export const BCRYPT_ROUNDS = 12;

/** Number of backup codes to generate */
export const BACKUP_CODE_COUNT = 10;

/** Length of each backup code (uppercase alphanumeric) */
export const BACKUP_CODE_LENGTH = 8;

/** Device trust duration in days */
export const DEVICE_TRUST_DAYS = 30;

/** Maximum failed TOTP attempts before lockout */
export const MAX_FAILED_ATTEMPTS = 5;

/** Lockout duration in minutes */
export const LOCKOUT_MINUTES = 15;

/** App name shown in authenticator apps */
export const TOTP_APP_NAME = 'Lingx';

// ============================================
// WebAuthn Constants
// ============================================

/** Minimum passkeys required for passwordless */
export const MIN_PASSKEYS_FOR_PASSWORDLESS = 2;
