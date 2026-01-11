import type { IQuery } from '../../../shared/cqrs/index.js';
import type { GlossaryStats } from '../repositories/glossary.repository.js';

/**
 * Query to get glossary statistics for a project.
 */
export class GetStatsQuery implements IQuery<GlossaryStats> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GlossaryStats;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
