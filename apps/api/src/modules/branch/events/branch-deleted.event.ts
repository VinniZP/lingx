import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a branch is deleted.
 */
export class BranchDeletedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the deleted branch */
    public readonly branchId: string,
    /** Name of the deleted branch (for activity metadata) */
    public readonly branchName: string,
    /** Project ID the branch belonged to */
    public readonly projectId: string,
    /** User who deleted the branch */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
