import { randomUUID } from 'crypto';
import type { MTProviderType } from '../../../services/providers/index.js';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when an MT configuration is deleted.
 */
export class ConfigDeletedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly provider: MTProviderType,
    public readonly userId: string,
    public readonly projectId: string
  ) {}
}
