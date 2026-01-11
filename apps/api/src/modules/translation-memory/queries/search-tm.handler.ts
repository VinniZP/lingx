import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';
import type { SearchTMQuery } from './search-tm.query.js';

/**
 * Handler for SearchTMQuery.
 * Searches translation memory for similar translations using fuzzy matching.
 */
export class SearchTMHandler implements IQueryHandler<SearchTMQuery> {
  constructor(
    private readonly translationMemoryRepository: TranslationMemoryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: SearchTMQuery): Promise<InferQueryResult<SearchTMQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const matches = await this.translationMemoryRepository.searchSimilar({
      projectId: query.projectId,
      sourceText: query.sourceText,
      sourceLanguage: query.sourceLanguage,
      targetLanguage: query.targetLanguage,
      minSimilarity: query.minSimilarity,
      limit: query.limit,
    });

    return { matches };
  }
}
