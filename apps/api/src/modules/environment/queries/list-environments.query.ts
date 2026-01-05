import type { IQuery } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Query to list all environments for a project.
 */
export class ListEnvironmentsQuery implements IQuery {
  readonly __brand = 'query' as const;

  constructor(
    /** Project ID to list environments for */
    public readonly projectId: string
  ) {}
}

/**
 * Result type for ListEnvironmentsQuery.
 */
export type ListEnvironmentsResult = EnvironmentWithBranch[];
