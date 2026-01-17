import type { IEvent } from '../../../shared/cqrs/index.js';

/** Request context for audit logging */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Event emitted when an admin impersonates a user.
 * Used for audit trail.
 */
export class UserImpersonatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the user being impersonated */
    public readonly targetUserId: string,
    /** ID of the admin performing the impersonation */
    public readonly actorId: string,
    /** When the impersonation token expires */
    public readonly tokenExpiry: Date,
    /** Request context for audit logging */
    public readonly requestContext: RequestContext = {},
    /** User state at time of impersonation */
    public readonly targetUserState?: Record<string, unknown>
  ) {
    this.occurredAt = new Date();
  }
}
