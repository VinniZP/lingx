/**
 * VerifyTotpCommand
 *
 * Verifies a TOTP token during login.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface VerifyTotpResult {
  success: boolean;
}

export class VerifyTotpCommand implements ICommand<VerifyTotpResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: VerifyTotpResult;

  constructor(
    public readonly userId: string,
    public readonly token: string,
    public readonly sessionId?: string,
    public readonly trustDevice?: boolean
  ) {}
}
