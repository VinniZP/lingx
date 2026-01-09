/**
 * IsPasswordlessQuery
 *
 * Simple query to check if user is passwordless.
 */
import type { IQuery } from '../../../../shared/cqrs/index.js';

export class IsPasswordlessQuery implements IQuery<boolean> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: boolean;

  constructor(public readonly userId: string) {}
}
