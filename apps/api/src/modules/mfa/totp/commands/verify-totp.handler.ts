/**
 * VerifyTotpHandler
 *
 * Verifies TOTP token during login with rate limiting.
 */
import {
  BadRequestError,
  FieldValidationError,
  UnauthorizedError,
} from '../../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { TotpVerifiedEvent } from '../../events/totp-verified.event.js';
import { DEVICE_TRUST_DAYS } from '../../shared/constants.js';
import { calculateFailedAttempt, checkTotpRateLimit } from '../../shared/rate-limit.js';
import type { TotpCryptoService } from '../../shared/totp-crypto.service.js';
import type { TotpRepository } from '../totp.repository.js';
import { VerifyTotpCommand, type VerifyTotpResult } from './verify-totp.command.js';

export class VerifyTotpHandler implements ICommandHandler<VerifyTotpCommand> {
  constructor(
    private readonly repository: TotpRepository,
    private readonly cryptoService: TotpCryptoService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: VerifyTotpCommand): Promise<VerifyTotpResult> {
    const user = await this.repository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled || !user.totpSecret || !user.totpSecretIv) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    // Check lockout
    checkTotpRateLimit(user);

    // Decrypt and verify
    const secret = this.cryptoService.decryptSecret(user.totpSecret, user.totpSecretIv);
    const isValid = this.cryptoService.verifyToken(secret, command.token);

    if (!isValid) {
      await this.handleFailedAttempt(command.userId, user.totpFailedAttempts);
      throw new FieldValidationError(
        [{ field: 'token', message: 'Invalid verification code', code: 'INVALID_TOKEN' }],
        'Invalid verification code'
      );
    }

    // Reset failed attempts on success
    await this.repository.resetFailedAttempts(command.userId);

    // Trust device if requested
    if (command.trustDevice && command.sessionId) {
      const trustedUntil = new Date();
      trustedUntil.setDate(trustedUntil.getDate() + DEVICE_TRUST_DAYS);
      await this.repository.setSessionTrust(command.sessionId, trustedUntil);
    }

    // Publish event
    await this.eventBus.publish(new TotpVerifiedEvent(command.userId, command.sessionId));

    return { success: true };
  }

  private async handleFailedAttempt(userId: string, currentAttempts: number): Promise<void> {
    const { newAttempts, lockUntil } = calculateFailedAttempt(currentAttempts);
    await this.repository.incrementFailedAttempts(userId, newAttempts, lockUntil);
  }
}
