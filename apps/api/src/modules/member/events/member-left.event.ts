import type { ProjectRole } from '@prisma/client';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a member leaves a project voluntarily.
 *
 * Side effects can include:
 * - Recording activity log
 */
export class MemberLeftEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** User who left */
    public readonly userId: string,
    /** Role the user had */
    public readonly role: ProjectRole
  ) {
    this.occurredAt = new Date();
  }
}
