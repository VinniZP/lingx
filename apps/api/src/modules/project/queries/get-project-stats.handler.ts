import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../project.repository.js';
import type { GetProjectStatsQuery } from './get-project-stats.query.js';

/**
 * Handler for GetProjectStatsQuery.
 * Retrieves project statistics with authorization check.
 */
export class GetProjectStatsHandler implements IQueryHandler<GetProjectStatsQuery> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetProjectStatsQuery): Promise<InferQueryResult<GetProjectStatsQuery>> {
    // Find project by ID or slug
    const project = await this.projectRepository.findByIdOrSlug(query.projectIdOrSlug);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user has access
    await this.accessService.verifyProjectAccess(query.userId, project.id);

    // Get stats
    const stats = await this.projectRepository.getStats(project.id);
    if (!stats) {
      throw new NotFoundError('Project');
    }

    return stats;
  }
}
