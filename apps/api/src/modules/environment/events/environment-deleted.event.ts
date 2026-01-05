import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when an environment is deleted.
 */
export class EnvironmentDeletedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the deleted environment */
    public readonly environmentId: string,
    /** Name of the deleted environment */
    public readonly environmentName: string,
    /** Project ID the environment belonged to */
    public readonly projectId: string,
    /** User who deleted the environment */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
