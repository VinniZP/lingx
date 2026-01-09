import type { SecurityService } from '../../../services/security.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { PasswordChangedEvent } from '../events/password-changed.event.js';
import type { ChangePasswordCommand } from './change-password.command.js';

/**
 * Handler for ChangePasswordCommand.
 * Changes password, revokes all sessions, creates new session, publishes event.
 */
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  constructor(
    private readonly securityService: SecurityService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: ChangePasswordCommand
  ): Promise<InferCommandResult<ChangePasswordCommand>> {
    const result = await this.securityService.changePassword(
      command.userId,
      command.sessionId,
      { currentPassword: command.currentPassword, newPassword: command.newPassword },
      command.requestMetadata
    );

    await this.eventBus.publish(new PasswordChangedEvent(command.userId, result.newSessionId));

    return result;
  }
}
