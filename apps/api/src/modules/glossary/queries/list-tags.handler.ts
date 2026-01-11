import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { ListTagsQuery } from './list-tags.query.js';

/**
 * Handler for ListTagsQuery.
 * Returns all glossary tags for a project with entry counts.
 */
export class ListTagsHandler implements IQueryHandler<ListTagsQuery> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: ListTagsQuery): Promise<InferQueryResult<ListTagsQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const tags = await this.glossaryRepository.listTags(query.projectId);

    return { tags };
  }
}
