import type { IEvent } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Event emitted when an environment is created.
 */
export class EnvironmentCreatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The created environment */
    public readonly environment: EnvironmentWithBranch,
    /** User who created the environment */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
