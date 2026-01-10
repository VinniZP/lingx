import type { ICommand } from '../../../shared/cqrs/index.js';
import type { BranchWithDetails } from '../repositories/branch.repository.js';

/**
 * Command to create a new branch with copy-on-write from source branch.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class CreateBranchCommand implements ICommand<BranchWithDetails> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: BranchWithDetails;

  constructor(
    /** Branch name */
    public readonly name: string,
    /** Space ID the branch belongs to */
    public readonly spaceId: string,
    /** Source branch ID to copy from */
    public readonly fromBranchId: string,
    /** User ID performing the action */
    public readonly userId: string
  ) {}
}
