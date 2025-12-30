import { z } from 'zod';
import { passwordSchema } from './common.schema.js';

// ============================================
// PASSWORD CHANGE
// ============================================

/**
 * Change password request - requires current password for verification
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Session response for API
 */
export const sessionResponseSchema = z.object({
  id: z.string(),
  deviceInfo: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastActive: z.string(),
  createdAt: z.string(),
  isCurrent: z.boolean(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/**
 * List sessions response
 */
export const sessionListResponseSchema = z.object({
  sessions: z.array(sessionResponseSchema),
});

export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;

/**
 * Revoke all sessions response
 */
export const revokeAllSessionsResponseSchema = z.object({
  message: z.string(),
  revokedCount: z.number(),
});

export type RevokeAllSessionsResponse = z.infer<typeof revokeAllSessionsResponseSchema>;

/**
 * Change password response
 */
export const changePasswordResponseSchema = z.object({
  message: z.string(),
});

export type ChangePasswordResponse = z.infer<typeof changePasswordResponseSchema>;
