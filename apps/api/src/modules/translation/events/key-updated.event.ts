import type { IEvent } from '../../../shared/cqrs/index.js';
import type { KeyWithTranslations } from '../repositories/translation.repository.js';

/**
 * Event emitted when a translation key is updated.
 */
export class KeyUpdatedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly key: KeyWithTranslations,
    public readonly userId: string,
    public readonly projectId: string,
    public readonly branchId: string
  ) {}
}
