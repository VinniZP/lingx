import type { IQuery } from '../../../shared/cqrs/index.js';
import type { ProjectWithStatsAndRole } from '../project.repository.js';

/**
 * Query to list all projects for a user with stats and roles.
 */
export class ListProjectsQuery implements IQuery<ProjectWithStatsAndRole[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ProjectWithStatsAndRole[];

  constructor(
    /** User ID to list projects for */
    public readonly userId: string
  ) {}
}
