/**
 * VerifyBackupCodeHandler
 *
 * Verifies backup code during login, marks it as used, and optionally trusts device.
 */
import {
  BadRequestError,
  FieldValidationError,
  UnauthorizedError,
} from '../../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { BackupCodeUsedEvent } from '../../events/backup-code-used.event.js';
import { DEVICE_TRUST_DAYS } from '../../shared/constants.js';
import { calculateFailedAttempt, checkTotpRateLimit } from '../../shared/rate-limit.js';
import type { TotpCryptoService } from '../../shared/totp-crypto.service.js';
import type { TotpRepository } from '../totp.repository.js';
import {
  VerifyBackupCodeCommand,
  type VerifyBackupCodeResult,
} from './verify-backup-code.command.js';

export class VerifyBackupCodeHandler implements ICommandHandler<VerifyBackupCodeCommand> {
  constructor(
    private readonly repository: TotpRepository,
    private readonly cryptoService: TotpCryptoService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: VerifyBackupCodeCommand): Promise<VerifyBackupCodeResult> {
    const user = await this.repository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    // Check rate limit (same as TOTP verification)
    checkTotpRateLimit(user);

    // Get unused backup codes
    const unusedCodes = await this.repository.getUnusedBackupCodes(command.userId);

    if (unusedCodes.length === 0) {
      throw new BadRequestError('No backup codes available');
    }

    // Try to find a matching code (constant-time: check all codes to prevent timing attacks)
    let matchedCode: { id: string; codeHash: string } | null = null;

    for (const code of unusedCodes) {
      const isValid = await this.cryptoService.verifyBackupCode(command.code, code.codeHash);
      if (isValid && !matchedCode) {
        matchedCode = code;
        // Don't break - continue checking all codes to prevent timing oracle
      }
    }

    if (!matchedCode) {
      // Increment failed attempts on invalid code
      await this.handleFailedAttempt(command.userId, user.totpFailedAttempts);
      throw new FieldValidationError(
        [{ field: 'code', message: 'Invalid backup code', code: 'INVALID_BACKUP_CODE' }],
        'Invalid backup code'
      );
    }

    // Mark code as used and reset failed attempts atomically
    await this.repository.markBackupCodeUsedAndResetAttempts(matchedCode.id, command.userId);

    // Trust device if requested
    if (command.trustDevice && command.sessionId) {
      const trustedUntil = new Date();
      trustedUntil.setDate(trustedUntil.getDate() + DEVICE_TRUST_DAYS);
      await this.repository.setSessionTrust(command.sessionId, trustedUntil);
    }

    // Publish event
    const remainingCodes = unusedCodes.length - 1;
    await this.eventBus.publish(new BackupCodeUsedEvent(command.userId, remainingCodes));

    return {
      success: true,
      remainingCodes,
    };
  }

  private async handleFailedAttempt(userId: string, currentAttempts: number): Promise<void> {
    const { newAttempts, lockUntil } = calculateFailedAttempt(currentAttempts);
    await this.repository.incrementFailedAttempts(userId, newAttempts, lockUntil);
  }
}
