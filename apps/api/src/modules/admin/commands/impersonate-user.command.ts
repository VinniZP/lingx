import type { ICommand } from '../../../shared/cqrs/index.js';

/** Result of impersonation command */
export interface ImpersonationResult {
  /** JWT token for impersonation */
  token: string;
  /** When the token expires (ISO string) */
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
