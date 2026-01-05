import type { IEvent } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Event emitted when an environment is updated.
 */
export class EnvironmentUpdatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The updated environment */
    public readonly environment: EnvironmentWithBranch,
    /** Previous environment name (if changed) */
    public readonly previousName?: string
  ) {
    this.occurredAt = new Date();
  }
}
