import type {
  ICommandBus,
  ICommandHandler,
  IEventBus,
  InferCommandResult,
} from '../../../shared/cqrs/index.js';
import { DeleteSessionCommand } from '../../security/commands/delete-session.command.js';
import { UserLoggedOutEvent } from '../events/user-logged-out.event.js';
import type { LogoutUserCommand } from './logout-user.command.js';

/**
 * Handler for LogoutUserCommand.
 * Deletes session and publishes UserLoggedOutEvent.
 */
export class LogoutUserHandler implements ICommandHandler<LogoutUserCommand> {
  constructor(
    private readonly commandBus: ICommandBus,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: LogoutUserCommand): Promise<InferCommandResult<LogoutUserCommand>> {
    // Delete session if provided
    if (command.sessionId) {
      await this.commandBus.execute(new DeleteSessionCommand(command.sessionId, command.userId));
    }

    // Always publish event (for audit logging)
    await this.eventBus.publish(new UserLoggedOutEvent(command.sessionId));
  }
}
