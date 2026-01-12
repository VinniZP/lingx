import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import type { GetBranchSummaryQuery } from './get-branch-summary.query.js';

/**
 * Handler for GetBranchSummaryQuery.
 * Returns quality summary statistics for a branch.
 */
export class GetBranchSummaryHandler implements IQueryHandler<GetBranchSummaryQuery> {
  constructor(
    private readonly qualityEstimationService: QualityEstimationService,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetBranchSummaryQuery): Promise<InferQueryResult<GetBranchSummaryQuery>> {
    await this.accessService.verifyBranchAccess(query.userId, query.branchId);

    return this.qualityEstimationService.getBranchSummary(query.branchId);
  }
}
