/**
 * Authentication Service
 *
 * Handles user registration and login with password hashing.
 * Uses bcrypt with cost factor 12 as specified in Design Doc NFRs.
 */
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  FieldValidationError,
  UnauthorizedError,
} from '../plugins/error-handler.js';
import { UNIQUE_VIOLATION_CODES } from '@localeflow/shared';

/** bcrypt cost factor per Design Doc NFRs */
const BCRYPT_ROUNDS = 12;

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Register a new user
   *
   * @param input - Registration data (email, password, name)
   * @returns User object without password
   * @throws FieldValidationError if email already exists
   */
  async register(input: RegisterInput): Promise<Omit<User, 'password'>> {
    // Check for existing user
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new FieldValidationError(
        [
          {
            field: 'email',
            message: 'This email is already registered',
            code: UNIQUE_VIOLATION_CODES.USER_EMAIL,
          },
        ],
        'Email already registered'
      );
    }

    // Hash password with cost factor 12
    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Authenticate user with email and password
   *
   * @param input - Login credentials
   * @returns User object without password
   * @throws UnauthorizedError if credentials are invalid
   */
  async login(input: LoginInput): Promise<Omit<User, 'password'>> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is passwordless
    if (!user.password) {
      throw new UnauthorizedError('Please sign in with your passkey');
    }

    // Verify password
    const validPassword = await bcrypt.compare(input.password, user.password);

    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by ID
   *
   * @param id - User ID
   * @returns User object without password, or null if not found
   */
  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
