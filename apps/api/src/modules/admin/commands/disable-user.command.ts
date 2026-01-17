import type { ICommand } from '../../../shared/cqrs/index.js';

/** Request context for audit logging */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Command to disable a user account.
 *
 * Permission rules:
 * - Only ADMIN can disable users
 * - Cannot disable self
 * - Cannot disable another ADMIN (safety protection)
 *
 * Effects:
 * - Sets isDisabled=true
 * - Deletes all user sessions (immediate logout)
 * - Anonymizes user in activity logs (GDPR)
 */
export class DisableUserCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** ID of the user to disable */
    public readonly targetUserId: string,
    /** ID of the admin performing the action */
    public readonly actorId: string,
    /** Request context for audit logging */
    public readonly requestContext: RequestContext = {}
  ) {}
}
