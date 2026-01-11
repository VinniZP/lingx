import { randomUUID } from 'crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';
import type { AIContextConfigInput } from '../repositories/ai-translation.repository.js';

/**
 * Event emitted when an AI context configuration is updated.
 */
export class ContextConfigUpdatedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly config: AIContextConfigInput,
    public readonly userId: string,
    public readonly projectId: string
  ) {}
}
