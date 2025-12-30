import { z } from 'zod';

// ============================================
// TOTP TOKEN VALIDATION
// ============================================

/**
 * TOTP token - 6 digits from authenticator app
 */
export const totpTokenSchema = z
  .string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d+$/, 'Code must contain only digits');

/**
 * Backup code - 8 uppercase alphanumeric characters
 */
export const backupCodeSchema = z
  .string()
  .length(8, 'Backup code must be 8 characters')
  .regex(/^[A-Z0-9]+$/, 'Invalid backup code format');

// ============================================
// SETUP FLOW
// ============================================

/**
 * Response from initiating TOTP setup
 */
export const totpSetupResponseSchema = z.object({
  secret: z.string(), // Base32 encoded secret for manual entry
  qrCodeUri: z.string(), // otpauth:// URI for QR code generation
  backupCodes: z.array(z.string()), // Plaintext codes (shown only once)
});

export type TotpSetupResponse = z.infer<typeof totpSetupResponseSchema>;

/**
 * Confirm TOTP setup with a valid token
 */
export const totpConfirmSchema = z.object({
  token: totpTokenSchema,
});

export type TotpConfirmInput = z.infer<typeof totpConfirmSchema>;

/**
 * Response after confirming setup - just backup codes for saving
 */
export const totpConfirmResponseSchema = z.object({
  backupCodes: z.array(z.string()),
});

export type TotpConfirmResponse = z.infer<typeof totpConfirmResponseSchema>;

// ============================================
// LOGIN VERIFICATION
// ============================================

/**
 * Verify TOTP during login
 */
export const totpVerifySchema = z.object({
  tempToken: z.string(), // Temporary token from login response
  token: totpTokenSchema,
  trustDevice: z.boolean().optional().default(false),
});

export type TotpVerifyInput = z.infer<typeof totpVerifySchema>;

/**
 * Use backup code during login
 */
export const backupCodeVerifySchema = z.object({
  tempToken: z.string(),
  code: backupCodeSchema,
  trustDevice: z.boolean().optional().default(false),
});

export type BackupCodeVerifyInput = z.infer<typeof backupCodeVerifySchema>;

// ============================================
// MANAGEMENT
// ============================================

/**
 * Disable TOTP (requires password confirmation)
 */
export const totpDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type TotpDisableInput = z.infer<typeof totpDisableSchema>;

/**
 * Regenerate backup codes (requires password confirmation)
 */
export const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type RegenerateBackupCodesInput = z.infer<typeof regenerateBackupCodesSchema>;

// ============================================
// STATUS
// ============================================

/**
 * TOTP status response
 */
export const totpStatusSchema = z.object({
  enabled: z.boolean(),
  enabledAt: z.string().nullable(),
  backupCodesRemaining: z.number(),
  trustedDevicesCount: z.number(),
});

export type TotpStatusResponse = z.infer<typeof totpStatusSchema>;

// ============================================
// LOGIN RESPONSE EXTENSIONS
// ============================================

/**
 * Login response when 2FA is required
 */
export const twoFactorRequiredResponseSchema = z.object({
  requiresTwoFactor: z.literal(true),
  tempToken: z.string(),
});

export type TwoFactorRequiredResponse = z.infer<typeof twoFactorRequiredResponseSchema>;
