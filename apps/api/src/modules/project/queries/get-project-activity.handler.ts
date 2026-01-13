import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ActivityService } from '../../../services/activity.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { ProjectRepository } from '../project.repository.js';
import type { GetProjectActivityQuery } from './get-project-activity.query.js';

/**
 * Handler for GetProjectActivityQuery.
 * Retrieves project activity feed with authorization check.
 */
export class GetProjectActivityHandler implements IQueryHandler<GetProjectActivityQuery> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly accessService: AccessService,
    private readonly activityService: ActivityService
  ) {}

  async execute(
    query: GetProjectActivityQuery
  ): Promise<InferQueryResult<GetProjectActivityQuery>> {
    // Find project by ID or slug
    const project = await this.projectRepository.findByIdOrSlug(query.projectIdOrSlug);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user has access
    await this.accessService.verifyProjectAccess(query.userId, project.id);

    // Get activities
    return this.activityService.getProjectActivities(project.id, {
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}
