import type { BranchQualitySummary } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to get quality summary for a branch.
 */
export class GetBranchSummaryQuery implements IQuery<BranchQualitySummary> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: BranchQualitySummary;

  constructor(
    public readonly branchId: string,
    public readonly userId: string
  ) {}
}
