import type { IQuery } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Query to get a single environment by ID.
 *
 * Handler throws NotFoundError if environment doesn't exist, so result is never null.
 * Result type is encoded in the interface for automatic type inference.
 */
export class GetEnvironmentQuery implements IQuery<EnvironmentWithBranch> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: EnvironmentWithBranch;

  constructor(
    /** Environment ID to fetch */
    public readonly id: string,
    /** User ID for authorization check */
    public readonly userId: string
  ) {}
}
