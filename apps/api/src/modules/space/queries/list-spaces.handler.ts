import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../../project/project.repository.js';
import type { SpaceRepository } from '../space.repository.js';
import type { ListSpacesQuery } from './list-spaces.query.js';

/**
 * Handler for ListSpacesQuery.
 * Returns all spaces for a project.
 */
export class ListSpacesHandler implements IQueryHandler<ListSpacesQuery> {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly projectRepository: ProjectRepository
  ) {}

  async execute(query: ListSpacesQuery): Promise<InferQueryResult<ListSpacesQuery>> {
    // Look up project by ID or slug (flexible lookup)
    const project = await this.projectRepository.findByIdOrSlug(query.projectId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user is a member of the project
    const isMember = await this.projectRepository.checkMembership(project.id, query.userId);
    if (!isMember) {
      throw new ForbiddenError('Not a member of this project');
    }

    return this.spaceRepository.findByProjectId(project.id);
  }
}
