/**
 * Profile Repository
 *
 * Data access layer for profile operations.
 * Business logic lives in command/query handlers, not here.
 */
import type { EmailVerification, Prisma, PrismaClient, User } from '@prisma/client';
import type { UserPreferences, UserWithEmailVerifications } from '../types.js';

export class ProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find user by ID with pending email verifications
   */
  async findById(userId: string): Promise<UserWithEmailVerifications | null> {
    return this.prisma.user.findUnique({
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
  }

  /**
   * Find user by ID (simple lookup, no relations)
   */
  async findByIdSimple(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Update user profile (name only)
   */
  async updateProfile(
    userId: string,
    data: { name?: string | null }
  ): Promise<UserWithEmailVerifications> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      include: {
        emailVerifications: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Update user avatar URL
   */
  async updateAvatar(userId: string, avatarUrl: string | null): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: UserPreferences): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { preferences: preferences as object },
    });
  }

  /**
   * Check if user is a member of a project
   */
  async isProjectMember(userId: string, projectId: string): Promise<boolean> {
    const membership = await this.prisma.projectMember.findFirst({
      where: { userId, projectId },
    });
    return !!membership;
  }

  /**
   * Create email verification record
   */
  async createEmailVerification(data: {
    userId: string;
    newEmail: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailVerification> {
    return this.prisma.emailVerification.create({
      data: {
        userId: data.userId,
        newEmail: data.newEmail.toLowerCase(),
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Find email verification by token
   */
  async findEmailVerificationByToken(
    token: string
  ): Promise<(EmailVerification & { user: User }) | null> {
    return this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * Delete email verification by ID
   */
  async deleteEmailVerification(id: string): Promise<void> {
    await this.prisma.emailVerification.delete({
      where: { id },
    });
  }

  /**
   * Delete all email verifications for a user
   */
  async deleteUserEmailVerifications(userId: string): Promise<void> {
    await this.prisma.emailVerification.deleteMany({
      where: { userId },
    });
  }

  /**
   * Update user email and delete verification in a transaction
   */
  async completeEmailChange(
    userId: string,
    newEmail: string,
    verificationId: string
  ): Promise<User> {
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      }),
      this.prisma.emailVerification.delete({
        where: { id: verificationId },
      }),
    ]);
    return updated;
  }

  /**
   * Execute operations in a transaction
   */
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
