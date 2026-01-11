import type { IEvent } from '../../../shared/cqrs/index.js';
import type { UserPreferences } from '../types.js';

/**
 * Event emitted when a user's preferences are updated.
 */
export class PreferencesUpdatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** User ID who updated preferences */
    public readonly userId: string,
    /** The updated preferences */
    public readonly preferences: UserPreferences
  ) {
    this.occurredAt = new Date();
  }
}
