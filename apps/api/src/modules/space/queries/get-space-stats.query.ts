import type { IQuery } from '../../../shared/cqrs/index.js';
import type { SpaceStats } from '../space.repository.js';

/**
 * Query to get space statistics.
 */
export class GetSpaceStatsQuery implements IQuery<SpaceStats> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: SpaceStats;

  constructor(
    /** Space ID */
    public readonly spaceId: string,
    /** ID of the user requesting the stats */
    public readonly userId: string
  ) {}
}
