/**
 * CancelTotpSetupCommand
 *
 * Cancels a pending TOTP setup by clearing the stored secret.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface CancelTotpSetupResult {
  success: boolean;
}

export class CancelTotpSetupCommand implements ICommand<CancelTotpSetupResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: CancelTotpSetupResult;

  constructor(public readonly userId: string) {}
}
