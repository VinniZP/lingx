import { randomUUID } from 'crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';
import type { AIProviderType } from '../services/ai-provider.service.js';

/**
 * Event emitted when an AI translation config is deleted.
 */
export class ConfigDeletedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly provider: AIProviderType,
    public readonly userId: string,
    public readonly projectId: string
  ) {}
}
