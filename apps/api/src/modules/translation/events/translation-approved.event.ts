import type { Translation } from '@prisma/client';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a translation is approved or rejected.
 */
export class TranslationApprovedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly translation: Translation,
    public readonly keyName: string,
    public readonly status: 'APPROVED' | 'REJECTED',
    public readonly userId: string,
    public readonly projectId: string,
    public readonly branchId: string
  ) {}
}

/**
 * Event emitted when multiple translations are approved or rejected in batch.
 */
export class TranslationsBatchApprovedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly translationIds: string[],
    public readonly status: 'APPROVED' | 'REJECTED',
    public readonly userId: string,
    public readonly projectId: string,
    public readonly branchId: string
  ) {}
}
