import { randomUUID } from 'crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';
import type { MTConfigResponse } from '../repositories/machine-translation.repository.js';

/**
 * Event emitted when an MT configuration is saved (created or updated).
 */
export class ConfigSavedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly config: MTConfigResponse,
    public readonly userId: string,
    public readonly projectId: string
  ) {}
}
