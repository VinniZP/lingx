/**
 * Profile Service
 *
 * Handles user profile operations including:
 * - Profile updates (name)
 * - Avatar management
 * - User preferences
 * - Email change with verification
 */
import type { PrismaClient, User, EmailVerification } from '@prisma/client';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import type { MultipartFile } from '@fastify/multipart';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  FieldValidationError,
} from '../plugins/error-handler.js';
import { UNIQUE_VIOLATION_CODES } from '@localeflow/shared';
import { EmailService } from './email.service.js';
import { FileStorageService } from './file-storage.service.js';

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

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    inApp: boolean;
    digestFrequency: 'never' | 'daily' | 'weekly';
  };
  defaultProjectId: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  pendingEmailChange: string | null;
  createdAt: Date;
}

// Default preferences for new users
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    inApp: true,
    digestFrequency: 'weekly',
  },
  defaultProjectId: null,
};

// Email verification token expiry (24 hours)
const TOKEN_EXPIRY_HOURS = 24;

export class ProfileService {
  constructor(
    private prisma: PrismaClient,
    private emailService: EmailService,
    private fileStorage: FileStorageService
  ) {}

  // ============================================
  // Profile Operations
  // ============================================

  /**
   * Get user profile with preferences and pending email change
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        emailVerifications: {
          where: {
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return this.toUserProfile(user, user.emailVerifications[0] || null);
  }

  /**
   * Update user profile (name only)
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined && { name: input.name || null }),
      },
      include: {
        emailVerifications: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.toUserProfile(updated, updated.emailVerifications[0] || null);
  }

  // ============================================
  // Avatar Operations
  // ============================================

  /**
   * Upload and save user avatar
   */
  async updateAvatar(
    userId: string,
    file: MultipartFile
  ): Promise<{ avatarUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Delete old avatar if exists
    if (user.avatarUrl) {
      await this.fileStorage.deleteAvatar(user.avatarUrl);
    }

    // Save new avatar
    const result = await this.fileStorage.saveAvatar(userId, file);

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.publicUrl },
    });

    return { avatarUrl: result.publicUrl };
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.avatarUrl) {
      await this.fileStorage.deleteAvatar(user.avatarUrl);

      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null },
      });
    }
  }

  // ============================================
  // Preferences Operations
  // ============================================

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    input: UpdatePreferencesInput
  ): Promise<UserPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Validate defaultProjectId if provided
    if (input.defaultProjectId) {
      const membership = await this.prisma.projectMember.findFirst({
        where: {
          userId,
          projectId: input.defaultProjectId,
        },
      });

      if (!membership) {
        throw new ValidationError('You are not a member of this project');
      }
    }

    // Merge with existing preferences
    const currentPrefs = (user.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;
    const newPrefs: UserPreferences = {
      theme: input.theme ?? currentPrefs.theme,
      language: input.language ?? currentPrefs.language,
      notifications: {
        email: input.notifications?.email ?? currentPrefs.notifications.email,
        inApp: input.notifications?.inApp ?? currentPrefs.notifications.inApp,
        digestFrequency:
          input.notifications?.digestFrequency ?? currentPrefs.notifications.digestFrequency,
      },
      defaultProjectId:
        input.defaultProjectId !== undefined
          ? input.defaultProjectId
          : currentPrefs.defaultProjectId,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: newPrefs as object },
    });

    return newPrefs;
  }

  // ============================================
  // Email Change Operations
  // ============================================

  /**
   * Initiate email change - sends verification to new email
   */
  async initiateEmailChange(userId: string, input: ChangeEmailInput): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if user has a password (passwordless users can't change email with password)
    if (!user.password) {
      throw new ValidationError('Passwordless users cannot change email with password verification');
    }

    // Verify password
    const validPassword = await bcrypt.compare(input.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Check if email is same as current
    if (input.newEmail.toLowerCase() === user.email.toLowerCase()) {
      throw new ValidationError('New email must be different from current email');
    }

    // Check if new email is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.newEmail.toLowerCase() },
    });

    if (existingUser) {
      throw new FieldValidationError(
        [
          {
            field: 'newEmail',
            message: 'This email is already in use',
            code: UNIQUE_VIOLATION_CODES.USER_EMAIL,
          },
        ],
        'Email already in use'
      );
    }

    // Delete any existing pending verifications for this user
    await this.prisma.emailVerification.deleteMany({
      where: { userId },
    });

    // Create new verification token
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    await this.prisma.emailVerification.create({
      data: {
        userId,
        newEmail: input.newEmail.toLowerCase(),
        token,
        expiresAt,
      },
    });

    // Send verification email to new address
    await this.emailService.sendEmailVerification(
      input.newEmail,
      token,
      user.name || undefined
    );

    // Send notification to old email
    await this.emailService.sendEmailChangeNotification(
      user.email,
      input.newEmail,
      user.name || undefined
    );
  }

  /**
   * Verify email change with token
   */
  async verifyEmailChange(token: string): Promise<UserProfile> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new ValidationError('Invalid or expired verification token');
    }

    if (verification.expiresAt < new Date()) {
      // Clean up expired token
      await this.prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      throw new ValidationError('Verification token has expired');
    }

    // Check if new email is still available
    const existingUser = await this.prisma.user.findUnique({
      where: { email: verification.newEmail },
    });

    if (existingUser) {
      throw new FieldValidationError(
        [
          {
            field: 'email',
            message: 'This email is now in use by another account',
            code: UNIQUE_VIOLATION_CODES.USER_EMAIL,
          },
        ],
        'Email no longer available'
      );
    }

    // Update email and delete verification
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { email: verification.newEmail },
      }),
      this.prisma.emailVerification.delete({
        where: { id: verification.id },
      }),
    ]);

    return this.toUserProfile(updated, null);
  }

  /**
   * Cancel pending email change
   */
  async cancelEmailChange(userId: string): Promise<void> {
    await this.prisma.emailVerification.deleteMany({
      where: { userId },
    });
  }

  /**
   * Get pending email verification for user
   */
  async getPendingVerification(userId: string): Promise<EmailVerification | null> {
    return this.prisma.emailVerification.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Transform user to profile response
   */
  private toUserProfile(
    user: User,
    pendingVerification: EmailVerification | null
  ): UserProfile {
    const preferences = (user.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
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
      pendingEmailChange: pendingVerification?.newEmail ?? null,
      createdAt: user.createdAt,
    };
  }
}
