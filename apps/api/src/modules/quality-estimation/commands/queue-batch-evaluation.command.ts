import type {
  BatchEvaluationOptions,
  BatchEvaluationResult,
} from '../../../services/batch-evaluation.service.js';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to queue batch quality evaluation for a branch.
 */
export class QueueBatchEvaluationCommand implements ICommand<BatchEvaluationResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: BatchEvaluationResult;

  constructor(
    public readonly branchId: string,
    public readonly userId: string,
    public readonly options: BatchEvaluationOptions
  ) {}
}
