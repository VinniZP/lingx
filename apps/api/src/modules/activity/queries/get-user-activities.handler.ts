import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ActivityRepository } from '../activity.repository.js';
import type { GetUserActivitiesQuery } from './get-user-activities.query.js';

/**
 * Handler for GetUserActivitiesQuery.
 * Retrieves recent activities for a user across all their projects.
 *
 * Authorization: Implicit - ActivityRepository filters to only return
 * activities from projects the user is a member of.
 */
export class GetUserActivitiesHandler implements IQueryHandler<GetUserActivitiesQuery> {
  constructor(private readonly activityRepository: ActivityRepository) {}

  async execute(query: GetUserActivitiesQuery): Promise<InferQueryResult<GetUserActivitiesQuery>> {
    const { userId, options } = query;

    return this.activityRepository.findUserActivities(userId, options);
  }
}
