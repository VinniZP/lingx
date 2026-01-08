import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a new API key is created.
 */
export class ApiKeyCreatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** User who created the key */
    public readonly userId: string,
    /** ID of the created API key */
    public readonly apiKeyId: string
  ) {
    this.occurredAt = new Date();
  }
}
