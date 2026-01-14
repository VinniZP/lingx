import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { GetUserDetailsQuery } from './get-user-details.query.js';

/**
 * Handler for GetUserDetailsQuery.
 * Returns detailed user information including projects and stats if the requester is an ADMIN.
 */
export class GetUserDetailsHandler implements IQueryHandler<GetUserDetailsQuery> {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(query: GetUserDetailsQuery): Promise<InferQueryResult<GetUserDetailsQuery>> {
    // Verify actor is an admin
    const actorRole = await this.adminRepository.findUserRoleById(query.actorId);
    if (!actorRole) {
      throw new NotFoundError('User not found');
    }
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // Get user details
    const user = await this.adminRepository.findUserById(query.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get last active timestamp
    const lastActiveAt = await this.adminRepository.getLastActiveAt(query.userId);

    return {
      ...user,
      stats: {
        projectCount: user.projectMembers.length,
        lastActiveAt,
      },
    };
  }
}
