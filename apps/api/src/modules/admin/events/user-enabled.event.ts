import type { IEvent } from '../../../shared/cqrs/index.js';

/** Request context for audit logging */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Event emitted when a user is enabled by an admin.
 */
export class UserEnabledEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the user who was enabled */
    public readonly userId: string,
    /** ID of the admin who enabled the user */
    public readonly actorId: string,
    /** Request context for audit logging */
    public readonly requestContext: RequestContext = {},
    /** User state before enabling */
    public readonly beforeState?: Record<string, unknown>,
    /** User state after enabling */
    public readonly afterState?: Record<string, unknown>
  ) {
    this.occurredAt = new Date();
  }
}
