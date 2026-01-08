import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when an API key is revoked.
 */
export class ApiKeyRevokedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** User who revoked the key */
    public readonly userId: string,
    /** ID of the revoked API key */
    public readonly apiKeyId: string
  ) {
    this.occurredAt = new Date();
  }
}
