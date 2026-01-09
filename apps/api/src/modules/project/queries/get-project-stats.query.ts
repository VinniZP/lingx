import type { IQuery } from '../../../shared/cqrs/index.js';
import type { ProjectStats } from '../project.repository.js';

/**
 * Query to get project statistics.
 */
export class GetProjectStatsQuery implements IQuery<ProjectStats> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ProjectStats;

  constructor(
    /** Project ID or slug */
    public readonly projectIdOrSlug: string,
    /** User ID requesting access */
    public readonly userId: string
  ) {}
}
