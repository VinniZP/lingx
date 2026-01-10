/**
 * InitiateTotpSetupHandler
 *
 * Generates TOTP secret and backup codes, stores them encrypted.
 */
import { BadRequestError, UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { ICommandHandler } from '../../../../shared/cqrs/index.js';
import type { TotpCryptoService } from '../../shared/totp-crypto.service.js';
import type { TotpRepository } from '../totp.repository.js';
import { InitiateTotpSetupCommand, type TotpSetupResult } from './initiate-totp-setup.command.js';

export class InitiateTotpSetupHandler implements ICommandHandler<InitiateTotpSetupCommand> {
  constructor(
    private readonly totpRepository: TotpRepository,
    private readonly totpCryptoService: TotpCryptoService
  ) {}

  async execute(command: InitiateTotpSetupCommand): Promise<TotpSetupResult> {
    const user = await this.totpRepository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled');
    }

    // Generate new TOTP secret
    const secret = this.totpCryptoService.generateSecret();

    // Generate backup codes
    const backupCodes = this.totpCryptoService.generateBackupCodes();

    // Hash backup codes for storage
    const backupCodeHashes = await this.totpCryptoService.hashBackupCodes(backupCodes);

    // Encrypt the secret
    const { encrypted, iv } = this.totpCryptoService.encryptSecret(secret);

    // Store encrypted secret and backup codes (NOT enabled yet)
    await this.totpRepository.saveTotpSetup(command.userId, {
      encryptedSecret: encrypted,
      secretIv: iv,
      backupCodeHashes,
    });

    // Generate QR code URI
    const qrCodeUri = this.totpCryptoService.generateQrCodeUri(user.email, secret);

    return {
      secret,
      qrCodeUri,
      backupCodes,
    };
  }
}
