import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../../project/project.repository.js';
import type { SpaceRepository } from '../space.repository.js';
import type { GetSpaceQuery } from './get-space.query.js';

/**
 * Handler for GetSpaceQuery.
 * Returns a space with its branches.
 */
export class GetSpaceHandler implements IQueryHandler<GetSpaceQuery> {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly projectRepository: ProjectRepository
  ) {}

  async execute(query: GetSpaceQuery): Promise<InferQueryResult<GetSpaceQuery>> {
    // Find space by ID
    const space = await this.spaceRepository.findById(query.spaceId);
    if (!space) {
      throw new NotFoundError('Space');
    }

    // Verify user is a member of the project
    const isMember = await this.projectRepository.checkMembership(space.projectId, query.userId);
    if (!isMember) {
      throw new ForbiddenError('Not a member of this project');
    }

    return space;
  }
}
