import type { IQuery } from '../../../shared/cqrs/index.js';
import type { UserWithoutPassword } from '../commands/register-user.command.js';

/**
 * Query to get the current authenticated user's information.
 */
export class GetCurrentUserQuery implements IQuery<UserWithoutPassword> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: UserWithoutPassword;

  constructor(
    /** User ID from JWT/API key authentication */
    public readonly userId: string
  ) {}
}
