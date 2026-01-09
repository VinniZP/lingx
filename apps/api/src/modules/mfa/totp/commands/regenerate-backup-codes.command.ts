/**
 * RegenerateBackupCodesCommand
 *
 * Regenerates backup codes for TOTP 2FA.
 * Requires password verification for security.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface RegenerateBackupCodesResult {
  codes: string[];
}

export class RegenerateBackupCodesCommand implements ICommand<RegenerateBackupCodesResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: RegenerateBackupCodesResult;

  constructor(
    public readonly userId: string,
    public readonly password: string
  ) {}
}
