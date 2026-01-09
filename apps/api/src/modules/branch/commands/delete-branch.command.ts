import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to delete a branch.
 *
 * Result type is void (no return value on success).
 */
export class DeleteBranchCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Branch ID to delete */
    public readonly branchId: string,
    /** User ID performing the action */
    public readonly userId: string
  ) {}
}
