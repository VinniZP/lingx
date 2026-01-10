/**
 * RegenerateBackupCodesHandler
 *
 * Generates new backup codes after password verification.
 * Invalidates all previous backup codes.
 */
import {
  BadRequestError,
  FieldValidationError,
  UnauthorizedError,
} from '../../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { BackupCodesRegeneratedEvent } from '../../events/backup-codes-regenerated.event.js';
import type { TotpCryptoService } from '../../shared/totp-crypto.service.js';
import type { TotpRepository } from '../totp.repository.js';
import {
  RegenerateBackupCodesCommand,
  type RegenerateBackupCodesResult,
} from './regenerate-backup-codes.command.js';

export class RegenerateBackupCodesHandler implements ICommandHandler<RegenerateBackupCodesCommand> {
  constructor(
    private readonly totpRepository: TotpRepository,
    private readonly totpCryptoService: TotpCryptoService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RegenerateBackupCodesCommand): Promise<RegenerateBackupCodesResult> {
    const user = await this.totpRepository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    // Passwordless users cannot regenerate codes this way
    if (!user.password) {
      throw new BadRequestError(
        'Passwordless users cannot regenerate backup codes via password verification'
      );
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

    // Generate new backup codes
    const newCodes = this.totpCryptoService.generateBackupCodes();
    const hashedCodes = await this.totpCryptoService.hashBackupCodes(newCodes);

    // Replace old codes with new ones
    await this.totpRepository.replaceBackupCodes(command.userId, hashedCodes);

    // Publish event
    await this.eventBus.publish(new BackupCodesRegeneratedEvent(command.userId));

    return { codes: newCodes };
  }
}
