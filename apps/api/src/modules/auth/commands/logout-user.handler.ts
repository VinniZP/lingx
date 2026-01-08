import type { SecurityService } from '../../../services/security.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { UserLoggedOutEvent } from '../events/user-logged-out.event.js';
import type { LogoutUserCommand } from './logout-user.command.js';

/**
 * Handler for LogoutUserCommand.
 * Deletes session and publishes UserLoggedOutEvent.
 */
export class LogoutUserHandler implements ICommandHandler<LogoutUserCommand> {
  constructor(
    private readonly securityService: SecurityService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: LogoutUserCommand): Promise<InferCommandResult<LogoutUserCommand>> {
    // Delete session if provided
    if (command.sessionId) {
      await this.securityService.deleteSession(command.sessionId);
    }

    // Always publish event (for audit logging)
    await this.eventBus.publish(new UserLoggedOutEvent(command.sessionId));
  }
}
