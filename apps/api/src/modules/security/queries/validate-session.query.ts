import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to validate if a session is valid (exists and not expired).
 * Uses Redis cache for fast lookups.
 */
export class ValidateSessionQuery implements IQuery<boolean> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: boolean;

  constructor(public readonly sessionId: string) {}
}
