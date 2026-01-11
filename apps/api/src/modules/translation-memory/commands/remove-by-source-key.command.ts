import type { ICommand } from '../../../shared/cqrs/index.js';

export interface RemoveBySourceKeyResult {
  deletedCount: number;
}

/**
 * Command to remove all TM entries for a source key.
 * Called by the TM worker when processing remove-entry jobs (triggered on key deletion).
 */
export class RemoveBySourceKeyCommand implements ICommand<RemoveBySourceKeyResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: RemoveBySourceKeyResult;

  constructor(public readonly keyId: string) {}
}
