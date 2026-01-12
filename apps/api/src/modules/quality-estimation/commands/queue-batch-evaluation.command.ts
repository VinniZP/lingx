import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Result of batch evaluation operation.
 */
export interface BatchEvaluationResult {
  jobId: string;
  stats: {
    total: number;
    cached: number;
    queued: number;
  };
}

/**
 * Options for batch evaluation.
 */
export interface BatchEvaluationOptions {
  translationIds?: string[];
  forceAI?: boolean;
}

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
