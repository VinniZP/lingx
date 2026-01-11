import type { EvaluateOptions, QualityScore } from '@lingx/shared';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to evaluate quality for a single translation.
 */
export class EvaluateQualityCommand implements ICommand<QualityScore> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: QualityScore;

  constructor(
    public readonly translationId: string,
    public readonly userId: string,
    public readonly options: EvaluateOptions
  ) {}
}
