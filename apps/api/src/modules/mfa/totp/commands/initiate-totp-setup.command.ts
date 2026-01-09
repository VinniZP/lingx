/**
 * InitiateTotpSetupCommand
 *
 * Initiates TOTP setup by generating secret and backup codes.
 * Does NOT enable TOTP - user must confirm with ConfirmTotpSetupCommand.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface TotpSetupResult {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

export class InitiateTotpSetupCommand implements ICommand<TotpSetupResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: TotpSetupResult;

  constructor(public readonly userId: string) {}
}
