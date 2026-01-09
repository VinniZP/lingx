/**
 * GetTotpStatusQuery
 *
 * Retrieves TOTP 2FA status for a user.
 */
import type { IQuery } from '../../../../shared/cqrs/index.js';

export interface TotpStatus {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
  trustedDevicesCount: number;
}

export class GetTotpStatusQuery implements IQuery<TotpStatus> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: TotpStatus;

  constructor(public readonly userId: string) {}
}
