/**
 * ConfirmTotpSetupCommand
 *
 * Confirms TOTP setup by verifying a token, enabling TOTP for the user.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export class ConfirmTotpSetupCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    public readonly userId: string,
    public readonly token: string
  ) {}
}
