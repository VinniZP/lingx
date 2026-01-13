import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { GetStatsQuery } from './get-stats.query.js';

/**
 * Handler for GetStatsQuery.
 * Returns aggregated glossary statistics for a project.
 */
export class GetStatsHandler implements IQueryHandler<GetStatsQuery> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetStatsQuery): Promise<InferQueryResult<GetStatsQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    return this.glossaryRepository.getStats(query.projectId);
  }
}
