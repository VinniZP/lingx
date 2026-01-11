import type { QualityScoringConfig } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to get quality scoring configuration for a project.
 */
export class GetQualityConfigQuery implements IQuery<QualityScoringConfig> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: QualityScoringConfig;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
