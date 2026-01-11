import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import { FieldValidationError, ValidationError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { EmailVerifiedEvent } from '../events/email-verified.event.js';
import { toUserProfile } from '../mappers/profile.mapper.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import type { VerifyEmailChangeCommand } from './verify-email-change.command.js';

/**
 * Handler for VerifyEmailChangeCommand.
 * Validates token, updates email, deletes verification record.
 */
export class VerifyEmailChangeHandler implements ICommandHandler<VerifyEmailChangeCommand> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: VerifyEmailChangeCommand
  ): Promise<InferCommandResult<VerifyEmailChangeCommand>> {
    const { token } = command;

    // Find verification record
    const verification = await this.profileRepository.findEmailVerificationByToken(token);
    if (!verification) {
      throw new ValidationError('Invalid or expired verification token');
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      // Clean up expired token
      await this.profileRepository.deleteEmailVerification(verification.id);
      throw new ValidationError('Verification token has expired');
    }

    // Check if new email is still available
    const existingUser = await this.profileRepository.findByEmail(verification.newEmail);
    if (existingUser) {
      throw new FieldValidationError(
        [
          {
            field: 'email',
            message: 'This email is now in use by another account',
            code: UNIQUE_VIOLATION_CODES.USER_EMAIL,
          },
        ],
        'Email no longer available'
      );
    }

    const previousEmail = verification.user.email;

    // Update email and delete verification
    const updated = await this.profileRepository.completeEmailChange(
      verification.userId,
      verification.newEmail,
      verification.id
    );

    // Email change verified - no pending email change
    const profile = toUserProfile(updated, { pendingEmailChange: null });

    // Emit event
    await this.eventBus.publish(
      new EmailVerifiedEvent(verification.userId, previousEmail, verification.newEmail)
    );

    return profile;
  }
}
