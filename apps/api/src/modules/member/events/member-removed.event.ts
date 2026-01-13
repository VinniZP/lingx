import type { ProjectRole } from '@prisma/client';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a member is removed from a project.
 *
 * Side effects can include:
 * - Recording activity log
 * - Notifying the removed user
 */
export class MemberRemovedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** User who was removed */
    public readonly userId: string,
    /** Role the user had */
    public readonly role: ProjectRole,
    /** User who performed the removal */
    public readonly actorId: string
  ) {
    this.occurredAt = new Date();
  }
}
