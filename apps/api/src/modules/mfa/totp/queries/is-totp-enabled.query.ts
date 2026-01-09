/**
 * IsTotpEnabledQuery
 *
 * Simple query to check if TOTP is enabled for a user.
 */
import type { IQuery } from '../../../../shared/cqrs/index.js';

export class IsTotpEnabledQuery implements IQuery<boolean> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: boolean;

  constructor(public readonly userId: string) {}
}
