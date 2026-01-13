import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import type { GetKeyIssuesQuery } from './get-key-issues.query.js';

/**
 * Handler for GetKeyIssuesQuery.
 * Returns quality issues for all translations of a key, grouped by language.
 */
export class GetKeyIssuesHandler implements IQueryHandler<GetKeyIssuesQuery> {
  constructor(
    private readonly qualityEstimationService: QualityEstimationService,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetKeyIssuesQuery): Promise<InferQueryResult<GetKeyIssuesQuery>> {
    await this.accessService.verifyKeyAccess(query.userId, query.keyId);

    const issues = await this.qualityEstimationService.getKeyQualityIssues(query.keyId);
    return { issues };
  }
}
