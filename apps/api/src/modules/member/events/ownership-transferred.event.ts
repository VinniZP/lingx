import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when project ownership is transferred.
 *
 * Side effects can include:
 * - Recording activity log
 * - Notifying both parties (new owner and previous owner)
 */
export class OwnershipTransferredEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** New owner's user ID */
    public readonly newOwnerId: string,
    /** Previous owner's user ID (the one who transferred) */
    public readonly previousOwnerId: string,
    /** Whether the previous owner kept ownership */
    public readonly previousOwnerKeptOwnership: boolean
  ) {
    this.occurredAt = new Date();
  }
}
