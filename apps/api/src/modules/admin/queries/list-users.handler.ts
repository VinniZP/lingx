import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { ListUsersQuery } from './list-users.query.js';

/**
 * Handler for ListUsersQuery.
 * Returns paginated list of all users if the requester is an ADMIN.
 */
export class ListUsersHandler implements IQueryHandler<ListUsersQuery> {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(query: ListUsersQuery): Promise<InferQueryResult<ListUsersQuery>> {
    // Verify actor is an admin
    const actorRole = await this.adminRepository.findUserRoleById(query.actorId);
    if (!actorRole) {
      throw new NotFoundError('User not found');
    }
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // Return paginated users
    return this.adminRepository.findAllUsers(query.filters, query.pagination);
  }
}
