import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ActivityService } from '../../../services/activity.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
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
    private readonly activityService: ActivityService,
    private readonly accessService: AccessService,
    private readonly prisma: PrismaClient
  ) {}

  async execute(
    query: GetActivityChangesQuery
  ): Promise<InferQueryResult<GetActivityChangesQuery>> {
    const { activityId, userId, options } = query;

    // Find activity to get projectId for authorization
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { projectId: true },
    });

    if (!activity) {
      throw new NotFoundError('Activity');
    }

    // Authorization: requires project membership (any role)
    // Return 404 instead of 403 to hide resource existence from unauthorized users
    try {
      await this.accessService.verifyProjectAccess(userId, activity.projectId);
    } catch (error) {
      // Check by error code (more reliable than instanceof across module boundaries)
      if (error instanceof Error && 'code' in error && error.code === 'FORBIDDEN') {
        throw new NotFoundError('Activity');
      }
      throw error;
    }

    return this.activityService.getActivityChanges(activityId, options);
  }
}
