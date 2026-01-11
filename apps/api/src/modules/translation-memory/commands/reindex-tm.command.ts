import type { ICommand } from '../../../shared/cqrs/index.js';

export interface ReindexTMResult {
  message: string;
  jobId: string;
}

/**
 * Command to trigger a full reindex of translation memory.
 * Queues a bulk index job to process all approved translations.
 * Requires MANAGER or OWNER role.
 */
export class ReindexTMCommand implements ICommand<ReindexTMResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: ReindexTMResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
