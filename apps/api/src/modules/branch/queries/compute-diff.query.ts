import type { IQuery } from '../../../shared/cqrs/index.js';
import type { BranchDiffResult } from '../services/diff-calculator.js';

/**
 * Query to compute diff between two branches.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class ComputeDiffQuery implements IQuery<BranchDiffResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: BranchDiffResult;

  constructor(
    /** Source branch ID (the one with changes to merge) */
    public readonly sourceBranchId: string,
    /** Target branch ID (the one receiving changes) */
    public readonly targetBranchId: string,
    /** User ID performing the query (for authorization) */
    public readonly userId: string
  ) {}
}
