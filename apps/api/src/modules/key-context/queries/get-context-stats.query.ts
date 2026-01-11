import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Result of context stats query.
 */
export interface ContextStatsResult {
  sameFile: number;
  sameComponent: number;
  semantic: number;
  nearby: number;
  keyPattern: number;
  keysWithSource: number;
}

/**
 * Query to get key context and relationship statistics for a branch.
 */
export class GetContextStatsQuery implements IQuery<ContextStatsResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ContextStatsResult;

  constructor(
    public readonly branchId: string,
    public readonly userId: string
  ) {}
}
