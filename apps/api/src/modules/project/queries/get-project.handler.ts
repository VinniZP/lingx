import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { ProjectRepository } from '../project.repository.js';
import type { GetProjectQuery } from './get-project.query.js';

/**
 * Handler for GetProjectQuery.
 * Retrieves a project by ID or slug with authorization check.
 */
export class GetProjectHandler implements IQueryHandler<GetProjectQuery> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetProjectQuery): Promise<InferQueryResult<GetProjectQuery>> {
    // Find project by ID or slug
    const project = await this.projectRepository.findByIdOrSlug(query.projectIdOrSlug);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user has access and get their role
    const { role } = await this.accessService.verifyProjectAccess(query.userId, project.id);

    return { project, role };
  }
}
