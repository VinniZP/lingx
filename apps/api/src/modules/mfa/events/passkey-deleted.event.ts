/**
 * PasskeyDeletedEvent
 *
 * Published when a user deletes a passkey.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class PasskeyDeletedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly credentialId: string
  ) {
    this.occurredAt = new Date();
  }
}
