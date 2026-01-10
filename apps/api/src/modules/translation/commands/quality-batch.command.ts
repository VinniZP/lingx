import type { ICommand, ProgressReporter } from '../../../shared/cqrs/index.js';

/**
 * Result of batch quality evaluation
 */
export interface QualityBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors?: Array<{ keyName: string; error: string }>;
}

/**
 * Command to run batch quality evaluation on translations.
 *
 * This command handles the `quality-batch` worker job type.
 * It evaluates translation quality using heuristics and optionally AI.
 *
 * Features:
 * - Multi-language batch evaluation for consistent scoring
 * - Groups translations by key for efficient AI calls
 * - Heuristic-only evaluation when scores are good
 * - Progress reporting via optional ProgressReporter
 */
export class QualityBatchCommand implements ICommand<QualityBatchResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: QualityBatchResult;

  constructor(
    public readonly translationIds: string[],
    public readonly projectId: string,
    public readonly branchId: string,
    public readonly forceAI?: boolean,
    public readonly progressReporter?: ProgressReporter
  ) {}
}
