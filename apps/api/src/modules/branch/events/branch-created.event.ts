import type { IEvent } from '../../../shared/cqrs/index.js';
import type { BranchWithDetails } from '../repositories/branch.repository.js';

/**
 * Event emitted when a branch is created.
 */
export class BranchCreatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The created branch with details */
    public readonly branch: BranchWithDetails,
    /** Name of the source branch (for activity metadata) */
    public readonly sourceBranchName: string | undefined,
    /** ID of the source branch */
    public readonly sourceBranchId: string,
    /** User who created the branch */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
