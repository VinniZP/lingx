import type { IEvent } from '../../../shared/cqrs/index.js';
import type { ProjectWithLanguages } from '../project.repository.js';

/**
 * Event emitted when a new project is created.
 *
 * Side effects can include:
 * - Recording activity log
 * - Sending welcome email
 * - Analytics tracking
 */
export class ProjectCreatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The newly created project */
    public readonly project: ProjectWithLanguages,
    /** ID of the user who created the project */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
