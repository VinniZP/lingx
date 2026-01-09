import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../project.repository.js';
import type { ListProjectsQuery } from './list-projects.query.js';

/**
 * Handler for ListProjectsQuery.
 * Retrieves all projects for a user with stats and roles.
 */
export class ListProjectsHandler implements IQueryHandler<ListProjectsQuery> {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async execute(query: ListProjectsQuery): Promise<InferQueryResult<ListProjectsQuery>> {
    return this.projectRepository.findByUserIdWithStats(query.userId);
  }
}
