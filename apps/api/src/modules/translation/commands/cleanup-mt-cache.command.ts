import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Result of MT cache cleanup
 */
export interface CleanupMTCacheResult {
  deletedCount: number;
}

/**
 * Command to clean up expired MT cache entries for a project.
 *
 * This command handles the `cleanup-cache` worker job type.
 * It removes cache entries that have exceeded their TTL.
 */
export class CleanupMTCacheCommand implements ICommand<CleanupMTCacheResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: CleanupMTCacheResult;

  constructor(public readonly projectId: string) {}
}
