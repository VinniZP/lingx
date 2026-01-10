import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when quality scores are updated for translations.
 */
export class QualityScoresUpdatedEvent implements IEvent {
  readonly occurredAt = new Date();

  constructor(
    public readonly keyId: string,
    public readonly keyName: string,
    public readonly languages: string[],
    public readonly projectId: string,
    public readonly branchId: string
  ) {}
}
