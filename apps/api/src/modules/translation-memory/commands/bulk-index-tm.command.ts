import type { ICommand } from '../../../shared/cqrs/index.js';

export interface BulkIndexTMResult {
  indexed: number;
}

/**
 * Command to bulk index all approved translations for a project.
 * Called by the TM worker when processing bulk-index jobs.
 */
export class BulkIndexTMCommand implements ICommand<BulkIndexTMResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: BulkIndexTMResult;

  constructor(public readonly projectId: string) {}
}
