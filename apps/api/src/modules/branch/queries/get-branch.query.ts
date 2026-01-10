import type { IQuery } from '../../../shared/cqrs/index.js';
import type { BranchWithDetails } from '../repositories/branch.repository.js';

/**
 * Query to get a branch by ID with details.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class GetBranchQuery implements IQuery<BranchWithDetails> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: BranchWithDetails;

  constructor(
    /** Branch ID to retrieve */
    public readonly branchId: string,
    /** User ID performing the query (for authorization) */
    public readonly userId: string
  ) {}
}
