/**
 * IsDeviceTrustedQuery
 *
 * Checks if a session is trusted for 2FA bypass.
 */
import type { IQuery } from '../../../../shared/cqrs/index.js';

export class IsDeviceTrustedQuery implements IQuery<boolean> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: boolean;

  constructor(public readonly sessionId: string) {}
}
