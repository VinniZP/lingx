/**
 * User Repository (Security Module)
 *
 * Data access layer for user operations needed by security handlers.
 * Contains only the subset of user operations required for security domain.
 */
import type { PrismaClient, User } from '@prisma/client';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find user by ID with password field.
   * Returns full user including password hash for verification.
   */
  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Update user password and delete all sessions atomically.
   * Used during password change to ensure all sessions are invalidated.
   */
  async updatePasswordAndDeleteSessions(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      await tx.session.deleteMany({
        where: { userId },
      });
    });
  }
}
