import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { ActivityRepository } from '../activity.repository.js';
import type { GetProjectActivitiesQuery } from './get-project-activities.query.js';

/**
 * Handler for GetProjectActivitiesQuery.
 * Retrieves recent activities for a specific project.
 *
 * Authorization: Requires membership in the project.
 * Returns 404 for both non-existent projects and unauthorized access
 * to prevent information disclosure about project existence.
 */
export class GetProjectActivitiesHandler implements IQueryHandler<GetProjectActivitiesQuery> {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(
    query: GetProjectActivitiesQuery
  ): Promise<InferQueryResult<GetProjectActivitiesQuery>> {
    const { projectId, userId, options } = query;

    // Authorization: requires project membership (any role)
    // Return 404 instead of 403 to hide resource existence from unauthorized users
    try {
      await this.accessService.verifyProjectAccess(userId, projectId);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'FORBIDDEN') {
        throw new NotFoundError('Project');
      }
      throw error;
    }

    return this.activityRepository.findProjectActivities(projectId, options);
  }
}
