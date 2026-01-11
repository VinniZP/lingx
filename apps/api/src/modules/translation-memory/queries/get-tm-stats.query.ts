import type { IQuery } from '../../../shared/cqrs/index.js';
import type { TMStats } from '../repositories/translation-memory.repository.js';

/**
 * Query to get translation memory statistics for a project.
 */
export class GetTMStatsQuery implements IQuery<TMStats> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: TMStats;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
