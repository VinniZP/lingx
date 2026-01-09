import type { IEvent } from '../../../shared/cqrs/index.js';
import type { ProjectWithLanguages } from '../project.repository.js';

/**
 * Event emitted when a project is updated.
 *
 * Side effects can include:
 * - Recording activity log
 * - Notifying project members
 */
export class ProjectUpdatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The updated project */
    public readonly project: ProjectWithLanguages,
    /** ID of the user who updated the project */
    public readonly userId: string,
    /** Fields that were changed */
    public readonly changedFields: string[],
    /** Previous values of changed fields */
    public readonly previousValues: Record<string, unknown>
  ) {
    this.occurredAt = new Date();
  }
}
