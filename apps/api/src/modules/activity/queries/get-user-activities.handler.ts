import type { ActivityService } from '../../../services/activity.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GetUserActivitiesQuery } from './get-user-activities.query.js';

/**
 * Handler for GetUserActivitiesQuery.
 * Retrieves recent activities for a user across all their projects.
 *
 * Authorization: Implicit - ActivityService filters to only return
 * activities from projects the user is a member of.
 */
export class GetUserActivitiesHandler implements IQueryHandler<GetUserActivitiesQuery> {
  constructor(private readonly activityService: ActivityService) {}

  async execute(query: GetUserActivitiesQuery): Promise<InferQueryResult<GetUserActivitiesQuery>> {
    const { userId, options } = query;

    return this.activityService.getUserActivities(userId, options);
  }
}
