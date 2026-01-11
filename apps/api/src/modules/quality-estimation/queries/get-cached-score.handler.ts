import type { AccessService } from '../../../services/access.service.js';
import type { QualityEstimationService } from '../../../services/quality-estimation.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GetCachedScoreQuery } from './get-cached-score.query.js';

/**
 * Handler for GetCachedScoreQuery.
 * Returns cached quality score without triggering evaluation.
 */
export class GetCachedScoreHandler implements IQueryHandler<GetCachedScoreQuery> {
  constructor(
    private readonly qualityEstimationService: QualityEstimationService,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetCachedScoreQuery): Promise<InferQueryResult<GetCachedScoreQuery>> {
    await this.accessService.verifyTranslationAccess(query.userId, query.translationId);

    return this.qualityEstimationService.getCachedScore(query.translationId);
  }
}
