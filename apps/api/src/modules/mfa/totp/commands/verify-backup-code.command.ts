/**
 * VerifyBackupCodeCommand
 *
 * Verifies a backup code during login when TOTP device is unavailable.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface VerifyBackupCodeResult {
  success: boolean;
  remainingCodes: number;
}

export class VerifyBackupCodeCommand implements ICommand<VerifyBackupCodeResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: VerifyBackupCodeResult;

  constructor(
    public readonly userId: string,
    public readonly code: string,
    public readonly sessionId?: string,
    public readonly trustDevice?: boolean
  ) {}
}
