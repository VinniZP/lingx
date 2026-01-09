/**
 * CancelTotpSetupHandler
 *
 * Cancels a pending TOTP setup by clearing stored secret and backup codes.
 */
import { BadRequestError, UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { ICommandHandler } from '../../../../shared/cqrs/index.js';
import type { TotpRepository } from '../totp.repository.js';
import { CancelTotpSetupCommand, type CancelTotpSetupResult } from './cancel-totp-setup.command.js';

export class CancelTotpSetupHandler implements ICommandHandler<CancelTotpSetupCommand> {
  constructor(private readonly repository: TotpRepository) {}

  async execute(command: CancelTotpSetupCommand): Promise<CancelTotpSetupResult> {
    const user = await this.repository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Cannot cancel if TOTP is already enabled
    if (user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled');
    }

    // Clear any pending setup
    await this.repository.clearTotpSetup(command.userId);

    return { success: true };
  }
}
