import type { IQuery } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Query to get a single environment by ID.
 */
export class GetEnvironmentQuery implements IQuery {
  readonly __brand = 'query' as const;

  constructor(
    /** Environment ID to fetch */
    public readonly id: string
  ) {}
}

/**
 * Result type for GetEnvironmentQuery.
 */
export type GetEnvironmentResult = EnvironmentWithBranch | null;
