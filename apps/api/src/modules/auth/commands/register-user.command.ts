import type { User } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * User without password (safe to return)
 */
export type UserWithoutPassword = Omit<User, 'password'>;

/**
 * Command to register a new user.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class RegisterUserCommand implements ICommand<UserWithoutPassword> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: UserWithoutPassword;

  constructor(
    /** User's email address */
    public readonly email: string,
    /** User's password (will be hashed) */
    public readonly password: string,
    /** Optional display name */
    public readonly name?: string
  ) {}
}
