import type { IEvent } from '../../../shared/cqrs/index.js';
import type { KeyWithTranslations } from '../repositories/translation.repository.js';

/**
 * Event emitted when a translation key is deleted.
 */
export class KeyDeletedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly key: KeyWithTranslations,
    public readonly userId: string,
    public readonly projectId: string,
    public readonly branchId: string
  ) {}
}

/**
 * Event emitted when multiple translation keys are deleted.
 */
export class KeysDeletedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly keys: KeyWithTranslations[],
    public readonly userId: string,
    public readonly projectId: string,
    public readonly branchId: string
  ) {}
}
