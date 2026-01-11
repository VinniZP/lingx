/**
 * Profile Mapper
 *
 * Shared utility for converting database user records to UserProfile DTOs.
 */
import type { EmailVerification } from '@prisma/client';
import { DEFAULT_PREFERENCES, type UserProfile, type UserRole } from '../types.js';

/**
 * User record with optional email verifications
 */
export interface UserWithEmailVerifications {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
  preferences: unknown;
  createdAt: Date;
  emailVerifications?: EmailVerification[];
}

/**
 * Convert a database user record to a UserProfile DTO.
 *
 * Handles:
 * - Merging preferences with defaults
 * - Extracting pending email change from verifications
 */
export function toUserProfile(
  user: UserWithEmailVerifications,
  options?: { pendingEmailChange?: string | null }
): UserProfile {
  const preferences = (user.preferences as typeof DEFAULT_PREFERENCES) || DEFAULT_PREFERENCES;
  const pendingVerification = user.emailVerifications?.[0] ?? null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    avatarUrl: user.avatarUrl,
    preferences: {
      theme: preferences.theme || DEFAULT_PREFERENCES.theme,
      language: preferences.language || DEFAULT_PREFERENCES.language,
      notifications: {
        email: preferences.notifications?.email ?? DEFAULT_PREFERENCES.notifications.email,
        inApp: preferences.notifications?.inApp ?? DEFAULT_PREFERENCES.notifications.inApp,
        digestFrequency:
          preferences.notifications?.digestFrequency ??
          DEFAULT_PREFERENCES.notifications.digestFrequency,
      },
      defaultProjectId: preferences.defaultProjectId ?? null,
    },
    pendingEmailChange: options?.pendingEmailChange ?? pendingVerification?.newEmail ?? null,
    createdAt: user.createdAt,
  };
}
