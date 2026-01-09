/**
 * PasskeyAuthenticatedEvent
 *
 * Published when a user successfully authenticates with a passkey.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class PasskeyAuthenticatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly credentialId: string
  ) {
    this.occurredAt = new Date();
  }
}
