import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to update TM entry usage count.
 * Called by the TM worker when processing update-usage jobs.
 * Note: This is the sync version called by the worker.
 * RecordTMUsageCommand is the async version that queues the job.
 */
export class UpdateTMUsageCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(public readonly entryId: string) {}
}
