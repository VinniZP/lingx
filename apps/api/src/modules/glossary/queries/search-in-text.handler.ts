import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { SearchInTextQuery } from './search-in-text.query.js';

/**
 * Handler for SearchInTextQuery.
 * Searches for glossary terms within source text using word boundary matching.
 */
export class SearchInTextHandler implements IQueryHandler<SearchInTextQuery> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: SearchInTextQuery): Promise<InferQueryResult<SearchInTextQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const matches = await this.glossaryRepository.searchInText({
      projectId: query.projectId,
      sourceText: query.sourceText,
      sourceLanguage: query.sourceLanguage,
      targetLanguage: query.targetLanguage,
      limit: query.limit,
    });

    return { matches };
  }
}
