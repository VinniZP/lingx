import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { GetUserActivityQuery } from './get-user-activity.query.js';

/**
 * Handler for GetUserActivityQuery.
 * Returns user's recent activity if the requester is an ADMIN.
 */
export class GetUserActivityHandler implements IQueryHandler<GetUserActivityQuery> {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(query: GetUserActivityQuery): Promise<InferQueryResult<GetUserActivityQuery>> {
    // Verify actor is an admin
    const actorRole = await this.adminRepository.findUserRoleById(query.actorId);
    if (!actorRole) {
      throw new NotFoundError('User not found');
    }
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // Verify target user exists
    const targetRole = await this.adminRepository.findUserRoleById(query.userId);
    if (!targetRole) {
      throw new NotFoundError('Target user not found');
    }

    // Return user activity (fallback to 50 if limit is explicitly undefined)
    return this.adminRepository.findUserActivity(query.userId, query.limit ?? 50);
  }
}
