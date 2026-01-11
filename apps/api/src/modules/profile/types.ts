/**
 * Profile Module Types
 *
 * Shared types for profile operations including input/output interfaces.
 */
import type { EmailVerification, User } from '@prisma/client';

// ============================================
// Preference Types
// ============================================

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  digestFrequency: 'never' | 'daily' | 'weekly';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
  defaultProjectId: string | null;
}

// Default preferences for new users
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    inApp: true,
    digestFrequency: 'weekly',
  },
  defaultProjectId: null,
};

// ============================================
// Profile Types
// ============================================

/**
 * User role - matches Prisma Role enum
 */
export type UserRole = 'DEVELOPER' | 'MANAGER' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatarUrl: string | null;
  preferences: UserPreferences;
  pendingEmailChange: string | null;
  createdAt: Date;
}

export interface UserWithEmailVerifications extends User {
  emailVerifications: EmailVerification[];
}

// ============================================
// Input Types
// ============================================

export interface UpdateProfileInput {
  name?: string;
}

export interface UpdatePreferencesInput {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    digestFrequency?: 'never' | 'daily' | 'weekly';
  };
  defaultProjectId?: string | null;
}

export interface ChangeEmailInput {
  newEmail: string;
  password: string;
}

// ============================================
// Output Types
// ============================================

export interface AvatarResult {
  avatarUrl: string;
}

// Email verification token expiry (24 hours)
export const TOKEN_EXPIRY_HOURS = 24;
