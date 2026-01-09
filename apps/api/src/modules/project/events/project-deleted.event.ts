import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a project is deleted.
 *
 * Side effects can include:
 * - Recording activity log
 * - Cleanup of related resources
 */
export class ProjectDeletedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the deleted project */
    public readonly projectId: string,
    /** Name of the deleted project (for logging) */
    public readonly projectName: string,
    /** ID of the user who deleted the project */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
