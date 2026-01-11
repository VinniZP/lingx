import type { ICommand } from '../../../shared/cqrs/index.js';

export interface RecordUsageResult {
  success: boolean;
}

/**
 * Command to record when a glossary term is applied.
 * Queues the usage tracking to be processed asynchronously.
 */
export class RecordUsageCommand implements ICommand<RecordUsageResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: RecordUsageResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly entryId: string
  ) {}
}
