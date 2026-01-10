/**
 * ConfirmTotpSetupHandler
 *
 * Verifies the TOTP token and enables 2FA for the user.
 */
import {
  BadRequestError,
  FieldValidationError,
  UnauthorizedError,
} from '../../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { TotpEnabledEvent } from '../../events/totp-enabled.event.js';
import type { TotpCryptoService } from '../../shared/totp-crypto.service.js';
import type { TotpRepository } from '../totp.repository.js';
import { ConfirmTotpSetupCommand } from './confirm-totp-setup.command.js';

export class ConfirmTotpSetupHandler implements ICommandHandler<ConfirmTotpSetupCommand> {
  constructor(
    private readonly totpRepository: TotpRepository,
    private readonly totpCryptoService: TotpCryptoService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: ConfirmTotpSetupCommand): Promise<void> {
    const user = await this.totpRepository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled');
    }

    if (!user.totpSecret || !user.totpSecretIv) {
      throw new BadRequestError('Please initiate setup first');
    }

    // Decrypt and verify the token
    const secret = this.totpCryptoService.decryptSecret(user.totpSecret, user.totpSecretIv);
    const isValid = this.totpCryptoService.verifyToken(secret, command.token);

    if (!isValid) {
      throw new FieldValidationError(
        [{ field: 'token', message: 'Invalid verification code', code: 'INVALID_TOKEN' }],
        'Invalid verification code'
      );
    }

    // Enable TOTP
    await this.totpRepository.enableTotp(command.userId);

    // Publish event
    await this.eventBus.publish(new TotpEnabledEvent(command.userId));
  }
}
