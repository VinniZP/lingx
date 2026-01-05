import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import type { ListEnvironmentsQuery } from './list-environments.query.js';

/**
 * Handler for ListEnvironmentsQuery.
 * Retrieves all environments for a project.
 *
 * Authorization: Requires membership in the project.
 */
export class ListEnvironmentsHandler implements IQueryHandler<ListEnvironmentsQuery> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: ListEnvironmentsQuery): Promise<InferQueryResult<ListEnvironmentsQuery>> {
    const { projectId, userId } = query;

    // Verify project exists first (consistent with other handlers)
    const projectExists = await this.environmentRepository.projectExists(projectId);
    if (!projectExists) {
      throw new NotFoundError('Project');
    }

    // Authorization: requires project membership (any role)
    await this.accessService.verifyProjectAccess(userId, projectId);

    return this.environmentRepository.findByProjectId(projectId);
  }
}
