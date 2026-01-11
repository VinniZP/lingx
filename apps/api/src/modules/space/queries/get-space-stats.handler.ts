import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../../project/project.repository.js';
import type { SpaceRepository } from '../space.repository.js';
import type { GetSpaceStatsQuery } from './get-space-stats.query.js';

/**
 * Handler for GetSpaceStatsQuery.
 * Returns space statistics including translation coverage by language.
 */
export class GetSpaceStatsHandler implements IQueryHandler<GetSpaceStatsQuery> {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly projectRepository: ProjectRepository
  ) {}

  async execute(query: GetSpaceStatsQuery): Promise<InferQueryResult<GetSpaceStatsQuery>> {
    // Verify space exists and get project ID
    const projectId = await this.spaceRepository.getProjectIdBySpaceId(query.spaceId);
    if (!projectId) {
      throw new NotFoundError('Space');
    }

    // Verify user is a member of the project
    const isMember = await this.projectRepository.checkMembership(projectId, query.userId);
    if (!isMember) {
      throw new ForbiddenError('Not a member of this project');
    }

    // Get stats
    const stats = await this.spaceRepository.getStats(query.spaceId);
    if (!stats) {
      throw new NotFoundError('Space');
    }

    return stats;
  }
}
