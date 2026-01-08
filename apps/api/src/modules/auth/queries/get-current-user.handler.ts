import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AuthService } from '../../../services/auth.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GetCurrentUserQuery } from './get-current-user.query.js';

/**
 * Handler for GetCurrentUserQuery.
 * Retrieves user by ID.
 */
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery> {
  constructor(private readonly authService: AuthService) {}

  async execute(query: GetCurrentUserQuery): Promise<InferQueryResult<GetCurrentUserQuery>> {
    const user = await this.authService.getUserById(query.userId);

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }
}
