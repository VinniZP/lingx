import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import {
  FieldValidationError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { EmailService } from '../../../shared/infrastructure/email.service.js';
import { EmailChangeInitiatedEvent } from '../events/email-change-initiated.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import { TOKEN_EXPIRY_HOURS } from '../types.js';
import type { InitiateEmailChangeCommand } from './initiate-email-change.command.js';

/**
 * Handler for InitiateEmailChangeCommand.
 * Validates password, creates verification token, sends emails.
 */
export class InitiateEmailChangeHandler implements ICommandHandler<InitiateEmailChangeCommand> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly emailService: EmailService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: InitiateEmailChangeCommand
  ): Promise<InferCommandResult<InitiateEmailChangeCommand>> {
    const { userId, input } = command;

    // Check if user exists
    const user = await this.profileRepository.findByIdSimple(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if user has a password (passwordless users can't change email with password)
    if (!user.password) {
      throw new ValidationError(
        'Passwordless users cannot change email with password verification'
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(input.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Check if email is same as current
    if (input.newEmail.toLowerCase() === user.email.toLowerCase()) {
      throw new ValidationError('New email must be different from current email');
    }

    // Check if new email is already in use
    const existingUser = await this.profileRepository.findByEmail(input.newEmail);
    if (existingUser) {
      throw new FieldValidationError(
        [
          {
            field: 'newEmail',
            message: 'This email is already in use',
            code: UNIQUE_VIOLATION_CODES.USER_EMAIL,
          },
        ],
        'Email already in use'
      );
    }

    // Delete any existing pending verifications for this user
    await this.profileRepository.deleteUserEmailVerifications(userId);

    // Create new verification token
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    await this.profileRepository.createEmailVerification({
      userId,
      newEmail: input.newEmail,
      token,
      expiresAt,
    });

    // Send verification email to new address - rollback on failure
    try {
      await this.emailService.sendEmailVerification(input.newEmail, token, user.name || undefined);
    } catch (error) {
      // Rollback: delete the verification record since email failed
      await this.profileRepository.deleteUserEmailVerifications(userId);
      throw new ValidationError('Failed to send verification email. Please try again.');
    }

    // Send notification to old email (best-effort, don't fail if this fails)
    try {
      await this.emailService.sendEmailChangeNotification(
        user.email,
        input.newEmail,
        user.name || undefined
      );
    } catch {
      // Notification is informational - log but don't fail the operation
    }

    // Emit event
    await this.eventBus.publish(new EmailChangeInitiatedEvent(userId, user.email, input.newEmail));
  }
}
