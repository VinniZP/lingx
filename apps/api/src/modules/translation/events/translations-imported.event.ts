import type { IEvent } from '../../../shared/cqrs/index.js';
import type { BulkUpdateResult } from '../repositories/translation.repository.js';

/**
 * Event emitted when translations are bulk imported (CLI push).
 */
export class TranslationsImportedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly result: BulkUpdateResult,
    public readonly keyCount: number,
    public readonly languages: string[],
    public readonly userId: string,
    public readonly projectId: string,
    public readonly branchId: string
  ) {}
}
