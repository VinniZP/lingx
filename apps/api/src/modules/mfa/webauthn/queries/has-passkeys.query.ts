/**
 * HasPasskeysQuery
 *
 * Checks if user has any passkeys (for login flow hint).
 */
import type { IQuery } from '../../../../shared/cqrs/index.js';

export class HasPasskeysQuery implements IQuery<boolean> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: boolean;

  constructor(public readonly email: string) {}
}
