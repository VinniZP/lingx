/**
 * DisableTotpHandler
 *
 * Disables TOTP 2FA after password verification.
 * Cleans up backup codes and device trust.
 */
import {
  BadRequestError,
  FieldValidationError,
  UnauthorizedError,
} from '../../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { TotpDisabledEvent } from '../../events/totp-disabled.event.js';
import type { TotpCryptoService } from '../../shared/totp-crypto.service.js';
import type { TotpRepository } from '../totp.repository.js';
import { DisableTotpCommand, type DisableTotpResult } from './disable-totp.command.js';

export class DisableTotpHandler implements ICommandHandler<DisableTotpCommand> {
  constructor(
    private readonly totpRepository: TotpRepository,
    private readonly totpCryptoService: TotpCryptoService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DisableTotpCommand): Promise<DisableTotpResult> {
    const user = await this.totpRepository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    // Passwordless users cannot disable TOTP this way
    if (!user.password) {
      throw new BadRequestError('Passwordless users cannot disable TOTP via password verification');
    }

    // Verify password
    const isValidPassword = await this.totpCryptoService.verifyPassword(
      command.password,
      user.password
    );

    if (!isValidPassword) {
      throw new FieldValidationError(
        [{ field: 'password', message: 'Incorrect password', code: 'INVALID_PASSWORD' }],
        'Incorrect password'
      );
    }

    // Disable TOTP (also clears backup codes and device trust)
    await this.totpRepository.disableTotp(command.userId);

    // Publish event
    await this.eventBus.publish(new TotpDisabledEvent(command.userId));

    return { success: true };
  }
}
