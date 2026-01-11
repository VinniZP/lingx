import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { ListEntriesQuery } from './list-entries.query.js';

/**
 * Handler for ListEntriesQuery.
 * Returns paginated glossary entries with filtering.
 */
export class ListEntriesHandler implements IQueryHandler<ListEntriesQuery> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: ListEntriesQuery): Promise<InferQueryResult<ListEntriesQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    return this.glossaryRepository.listEntries(query.projectId, query.filters);
  }
}
