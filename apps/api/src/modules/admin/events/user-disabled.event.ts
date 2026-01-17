import type { IEvent } from '../../../shared/cqrs/index.js';

/** Request context for audit logging */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Event emitted when a user is disabled by an admin.
 */
export class UserDisabledEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the user who was disabled */
    public readonly userId: string,
    /** ID of the admin who disabled the user */
    public readonly actorId: string,
    /** Whether activity was anonymized */
    public readonly anonymized: boolean,
    /** Request context for audit logging */
    public readonly requestContext: RequestContext = {},
    /** User state before disabling */
    public readonly beforeState?: Record<string, unknown>,
    /** User state after disabling */
    public readonly afterState?: Record<string, unknown>
  ) {
    this.occurredAt = new Date();
  }
}
