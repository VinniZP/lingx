import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';
import type { GetTMStatsQuery } from './get-tm-stats.query.js';

/**
 * Handler for GetTMStatsQuery.
 * Gets translation memory statistics for a project.
 */
export class GetTMStatsHandler implements IQueryHandler<GetTMStatsQuery> {
  constructor(
    private readonly translationMemoryRepository: TranslationMemoryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetTMStatsQuery): Promise<InferQueryResult<GetTMStatsQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    return this.translationMemoryRepository.getStats(query.projectId);
  }
}
