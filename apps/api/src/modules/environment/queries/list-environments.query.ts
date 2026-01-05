import type { IQuery } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Query to list all environments for a project.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class ListEnvironmentsQuery implements IQuery<EnvironmentWithBranch[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: EnvironmentWithBranch[];

  constructor(
    /** Project ID to list environments for */
    public readonly projectId: string,
    /** User ID for authorization check */
    public readonly userId: string
  ) {}
}
