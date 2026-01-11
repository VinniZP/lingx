import type { AccessService } from '../../../services/access.service.js';
import type { KeyContextService } from '../../../services/key-context.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GetContextStatsQuery } from './get-context-stats.query.js';

/**
 * Handler for GetContextStatsQuery.
 * Returns relationship statistics for a branch.
 */
export class GetContextStatsHandler implements IQueryHandler<GetContextStatsQuery> {
  constructor(
    private readonly keyContextService: KeyContextService,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetContextStatsQuery): Promise<InferQueryResult<GetContextStatsQuery>> {
    const { branchId, userId } = query;

    // Verify user has access to the branch
    await this.accessService.verifyBranchAccess(userId, branchId);

    // Get stats
    return this.keyContextService.getRelationshipStats(branchId);
  }
}
