/**
 * Auth Repository
 *
 * Data access layer for user operations in the auth module.
 * Encapsulates all Prisma queries for user-related operations.
 */
import type { PrismaClient, User } from '@prisma/client';

export type UserWithoutPassword = Omit<User, 'password'>;

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
}

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find user by email with password field.
   * Used for authentication (login).
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID without password field.
   * Used for profile retrieval.
   */
  async findById(id: string): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    });
  }

  /**
   * Check if an email is already registered.
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  /**
   * Create a new user.
   * Password should be pre-hashed by the handler.
   */
  async create(data: CreateUserData): Promise<UserWithoutPassword> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
      omit: { password: true },
    });
  }
}
