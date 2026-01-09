/**
 * DisableTotpCommand
 *
 * Disables TOTP two-factor authentication for a user.
 * Requires password verification for security.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface DisableTotpResult {
  success: boolean;
}

export class DisableTotpCommand implements ICommand<DisableTotpResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: DisableTotpResult;

  constructor(
    public readonly userId: string,
    public readonly password: string
  ) {}
}
