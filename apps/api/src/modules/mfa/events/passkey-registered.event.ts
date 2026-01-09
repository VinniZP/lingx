/**
 * PasskeyRegisteredEvent
 *
 * Published when a user registers a new passkey.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class PasskeyRegisteredEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly credentialId: string,
    public readonly credentialName: string
  ) {
    this.occurredAt = new Date();
  }
}
