import type { ProjectRole } from '@prisma/client';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a member's role is changed.
 *
 * Side effects can include:
 * - Recording activity log
 * - Notifying the affected user
 */
export class MemberRoleChangedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** User whose role was changed */
    public readonly userId: string,
    /** Previous role */
    public readonly oldRole: ProjectRole,
    /** New role */
    public readonly newRole: ProjectRole,
    /** User who made the change */
    public readonly actorId: string
  ) {
    this.occurredAt = new Date();
  }
}
