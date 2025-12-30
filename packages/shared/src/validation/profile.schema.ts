import { z } from 'zod';
import { nameSchema, emailSchema } from './common.schema.js';

// ============================================
// User Preferences Schema
// ============================================

export const themeSchema = z.enum(['light', 'dark', 'system']);

export const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  digestFrequency: z.enum(['never', 'daily', 'weekly']).optional(),
});

export const userPreferencesSchema = z.object({
  theme: themeSchema,
  language: z.string().min(2).max(10),
  notifications: z.object({
    email: z.boolean(),
    inApp: z.boolean(),
    digestFrequency: z.enum(['never', 'daily', 'weekly']),
  }),
  defaultProjectId: z.string().nullable(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// ============================================
// Profile Update Schemas
// ============================================

/**
 * Update profile (name only)
 */
export const updateProfileSchema = z.object({
  name: nameSchema.optional().or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Update user preferences
 */
export const updatePreferencesSchema = z.object({
  theme: themeSchema.optional(),
  language: z.string().min(2).max(10).optional(),
  notifications: notificationPreferencesSchema.optional(),
  defaultProjectId: z.string().optional().nullable(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// ============================================
// Email Change Schemas
// ============================================

/**
 * Initiate email change - requires password for security
 */
export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

/**
 * Verify email change with token
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ============================================
// Profile Response Schemas
// ============================================

export const userProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.string(),
  avatarUrl: z.string().nullable(),
  preferences: userPreferencesSchema,
  pendingEmailChange: z.string().nullable(),
  createdAt: z.string(),
});

export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

export const avatarResponseSchema = z.object({
  avatarUrl: z.string(),
});

export type AvatarResponse = z.infer<typeof avatarResponseSchema>;
