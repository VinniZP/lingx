import type { ICommand } from '../../../shared/cqrs/index.js';

/** Request context for audit logging */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Command to enable a disabled user account.
 *
 * Permission rules:
 * - Only ADMIN can enable users
 *
 * Effects:
 * - Sets isDisabled=false
 * - Clears disabledAt and disabledById
 */
export class EnableUserCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** ID of the user to enable */
    public readonly targetUserId: string,
    /** ID of the admin performing the action */
    public readonly actorId: string,
    /** Request context for audit logging */
    public readonly requestContext: RequestContext = {}
  ) {}
}
