import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to cleanup all expired sessions.
 * Used by periodic maintenance jobs.
 * Returns the count of deleted sessions.
 */
export class CleanupExpiredSessionsCommand implements ICommand<number> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: number;
}
