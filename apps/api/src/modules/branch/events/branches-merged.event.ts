import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when branches are merged.
 */
export class BranchesMergedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** Source branch ID */
    public readonly sourceBranchId: string,
    /** Source branch name */
    public readonly sourceBranchName: string,
    /** Target branch ID */
    public readonly targetBranchId: string,
    /** Target branch name */
    public readonly targetBranchName: string,
    /** Project ID */
    public readonly projectId: string,
    /** Number of conflicts that were resolved */
    public readonly conflictsResolved: number,
    /** User who performed the merge */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
