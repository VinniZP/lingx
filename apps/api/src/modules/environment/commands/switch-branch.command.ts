import type { ICommand } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Command to switch an environment's branch pointer.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class SwitchBranchCommand implements ICommand<EnvironmentWithBranch> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: EnvironmentWithBranch;

  constructor(
    /** Environment ID to update */
    public readonly environmentId: string,
    /** New branch ID to point to */
    public readonly branchId: string,
    /** User ID performing the action (for activity logging) */
    public readonly userId: string
  ) {}
}
