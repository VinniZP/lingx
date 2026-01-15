import type { ICommand } from '../../../shared/cqrs/index.js';

/** Result of impersonation command - validation only, JWT signing in route */
export interface ImpersonationResult {
  /** ID of the target user (validated) */
  targetUserId: string;
  /** Name of the target user (for display) */
  targetUserName: string | null;
  /** Email of the target user (for display) */
  targetUserEmail: string;
  /** ID of the admin performing impersonation */
  actorId: string;
  /** When the token should expire (ISO string) */
  expiresAt: string;
}

/**
 * Command to generate an impersonation token for a user.
 *
 * Permission rules:
 * - Only ADMIN can impersonate users
 * - Cannot impersonate self
 * - Cannot impersonate disabled users
 *
 * Effects:
 * - Generates a 1-hour JWT with impersonation claim
 * - Emits UserImpersonatedEvent for audit trail
 */
export class ImpersonateUserCommand implements ICommand<ImpersonationResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: ImpersonationResult;

  constructor(
    /** ID of the user to impersonate */
    public readonly targetUserId: string,
    /** ID of the admin performing the impersonation */
    public readonly actorId: string
  ) {}
}
