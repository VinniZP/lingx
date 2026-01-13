import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { ActivityRepository } from '../activity.repository.js';
import type { GetActivityChangesQuery } from './get-activity-changes.query.js';

/**
 * Handler for GetActivityChangesQuery.
 * Retrieves full audit trail for a specific activity.
 *
 * Authorization: Requires membership in the activity's project.
 * Returns 404 for both non-existent activities and unauthorized access
 * to prevent information disclosure about activity existence.
 */
export class GetActivityChangesHandler implements IQueryHandler<GetActivityChangesQuery> {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(
    query: GetActivityChangesQuery
  ): Promise<InferQueryResult<GetActivityChangesQuery>> {
    const { activityId, userId, options } = query;

    // Find activity to get projectId for authorization
    const activity = await this.activityRepository.findById(activityId);

    if (!activity) {
      throw new NotFoundError('Activity');
    }

    // Authorization: requires project membership (any role)
    // Return 404 instead of 403 to hide resource existence from unauthorized users
    try {
      await this.accessService.verifyProjectAccess(userId, activity.projectId);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'FORBIDDEN') {
        throw new NotFoundError('Activity');
      }
      throw error;
    }

    return this.activityRepository.findActivityChanges(activityId, options);
  }
}
