import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { GetCurrentUserQuery } from './get-current-user.query.js';

/**
 * Handler for GetCurrentUserQuery.
 * Retrieves user by ID via repository.
 */
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery> {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(query: GetCurrentUserQuery): Promise<InferQueryResult<GetCurrentUserQuery>> {
    const user = await this.authRepository.findById(query.userId);

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }
}
