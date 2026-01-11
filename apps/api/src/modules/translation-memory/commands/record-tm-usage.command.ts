import type { ICommand } from '../../../shared/cqrs/index.js';

export interface RecordTMUsageResult {
  success: boolean;
}

/**
 * Command to record when a TM suggestion is applied.
 * Queues the usage tracking to be processed asynchronously.
 */
export class RecordTMUsageCommand implements ICommand<RecordTMUsageResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: RecordTMUsageResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly entryId: string
  ) {}
}
