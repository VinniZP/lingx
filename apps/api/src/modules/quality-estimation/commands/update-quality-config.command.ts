import type { QualityScoringConfig } from '@lingx/shared';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to update quality scoring configuration for a project.
 */
export class UpdateQualityConfigCommand implements ICommand<QualityScoringConfig> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: QualityScoringConfig;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: Partial<QualityScoringConfig>
  ) {}
}
