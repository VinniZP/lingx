import type { IQueryHandler } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import type { ListEnvironmentsQuery, ListEnvironmentsResult } from './list-environments.query.js';

/**
 * Handler for ListEnvironmentsQuery.
 * Retrieves all environments for a project.
 */
export class ListEnvironmentsHandler implements IQueryHandler<
  ListEnvironmentsQuery,
  ListEnvironmentsResult
> {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(query: ListEnvironmentsQuery): Promise<ListEnvironmentsResult> {
    return this.environmentRepository.findByProjectId(query.projectId);
  }
}
