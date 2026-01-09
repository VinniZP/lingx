import type { IQuery } from '../../../shared/cqrs/index.js';
import type { BranchWithKeyCount } from '../repositories/branch.repository.js';

/**
 * Query to list all branches for a space.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class ListBranchesQuery implements IQuery<BranchWithKeyCount[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: BranchWithKeyCount[];

  constructor(
    /** Space ID to list branches for */
    public readonly spaceId: string,
    /** User ID performing the query (for authorization) */
    public readonly userId: string
  ) {}
}
