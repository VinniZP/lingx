import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../project.repository.js';
import type { GetProjectTreeQuery } from './get-project-tree.query.js';

/**
 * Handler for GetProjectTreeQuery.
 * Retrieves project navigation tree with authorization check.
 */
export class GetProjectTreeHandler implements IQueryHandler<GetProjectTreeQuery> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetProjectTreeQuery): Promise<InferQueryResult<GetProjectTreeQuery>> {
    // Find project by ID or slug
    const project = await this.projectRepository.findByIdOrSlug(query.projectIdOrSlug);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user has access
    await this.accessService.verifyProjectAccess(query.userId, project.id);

    // Get tree
    const tree = await this.projectRepository.getTree(project.id);
    if (!tree) {
      throw new NotFoundError('Project');
    }

    return tree;
  }
}
