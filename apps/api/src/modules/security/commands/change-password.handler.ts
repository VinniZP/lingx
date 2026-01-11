import bcrypt from 'bcrypt';
import {
  BadRequestError,
  FieldValidationError,
  UnauthorizedError,
} from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { PasswordChangedEvent } from '../events/password-changed.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';
import type { UserRepository } from '../user.repository.js';
import { parseUserAgent } from '../utils.js';
import type { ChangePasswordCommand } from './change-password.command.js';

/** bcrypt cost factor per Design Doc NFRs */
const BCRYPT_ROUNDS = 12;

/**
 * Handler for ChangePasswordCommand.
 * Validates current password, updates to new password, revokes all sessions,
 * creates new session, and publishes PasswordChangedEvent.
 */
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: ChangePasswordCommand
  ): Promise<InferCommandResult<ChangePasswordCommand>> {
    // Get user with password
    const user = await this.userRepository.findByIdWithPassword(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user is passwordless
    if (!user.password) {
      throw new BadRequestError(
        'You are passwordless and cannot change your password. Add a password first.'
      );
    }

    // Validate current password
    const isValid = await bcrypt.compare(command.currentPassword, user.password);
    if (!isValid) {
      throw new FieldValidationError(
        [
          {
            field: 'currentPassword',
            message: 'Current password is incorrect',
            code: 'INVALID_PASSWORD',
          },
        ],
        'Invalid current password'
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(command.newPassword, BCRYPT_ROUNDS);

    // Update password and delete all sessions atomically
    await this.userRepository.updatePasswordAndDeleteSessions(command.userId, hashedPassword);

    // Invalidate all cached sessions for this user
    await this.sessionCacheService.invalidateAllForUser(command.userId);

    // Create new session for current device
    const deviceInfo = command.requestMetadata.userAgent
      ? parseUserAgent(command.requestMetadata.userAgent)
      : null;

    const newSession = await this.sessionRepository.create({
      userId: command.userId,
      userAgent: command.requestMetadata.userAgent,
      deviceInfo,
      ipAddress: command.requestMetadata.ipAddress,
    });

    // Cache the new session
    await this.sessionCacheService.setValid(newSession.id, newSession.userId);

    // Publish event for side effects
    await this.eventBus.publish(new PasswordChangedEvent(command.userId, newSession.id));

    return { newSessionId: newSession.id };
  }
}
