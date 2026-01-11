import type { AccessService } from '../../../services/access.service.js';
import type { QualityEstimationService } from '../../../services/quality-estimation.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GetQualityConfigQuery } from './get-quality-config.query.js';

/**
 * Handler for GetQualityConfigQuery.
 * Returns quality scoring configuration for a project.
 */
export class GetQualityConfigHandler implements IQueryHandler<GetQualityConfigQuery> {
  constructor(
    private readonly qualityEstimationService: QualityEstimationService,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetQualityConfigQuery): Promise<InferQueryResult<GetQualityConfigQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    return this.qualityEstimationService.getConfig(query.projectId);
  }
}
