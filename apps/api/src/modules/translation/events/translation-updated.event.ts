import type { Translation } from '@prisma/client';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a translation value is updated.
 */
export class TranslationUpdatedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly translation: Translation,
    public readonly keyName: string,
    public readonly userId: string,
    public readonly projectId: string,
    public readonly branchId: string,
    public readonly oldValue?: string
  ) {}
}

/**
 * Event emitted when multiple translations are updated for a key.
 */
export class KeyTranslationsUpdatedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly keyId: string,
    public readonly keyName: string,
    public readonly changedLanguages: string[],
    public readonly userId: string,
    public readonly projectId: string,
    public readonly branchId: string
  ) {}
}
