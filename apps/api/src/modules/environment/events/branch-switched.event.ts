import type { IEvent } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Event emitted when an environment's branch pointer is switched.
 */
export class BranchSwitchedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The updated environment */
    public readonly environment: EnvironmentWithBranch,
    /** Previous branch ID */
    public readonly previousBranchId: string,
    /** Previous branch name (for activity logging) */
    public readonly previousBranchName: string | undefined,
    /** User who performed the switch */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
