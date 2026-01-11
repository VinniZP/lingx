import { randomUUID } from 'crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';
import type { AIConfigResponse } from '../repositories/ai-translation.repository.js';

/**
 * Event emitted when an AI translation config is saved (created or updated).
 */
export class ConfigSavedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly config: AIConfigResponse,
    public readonly userId: string,
    public readonly projectId: string
  ) {}
}
