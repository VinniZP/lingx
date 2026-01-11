import type { QualityScore } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to get cached quality score for a translation.
 */
export class GetCachedScoreQuery implements IQuery<QualityScore | null> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: QualityScore | null;

  constructor(
    public readonly translationId: string,
    public readonly userId: string
  ) {}
}
