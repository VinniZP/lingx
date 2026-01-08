import type { AuthService } from '../../../services/auth.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { UserRegisteredEvent } from '../events/user-registered.event.js';
import type { RegisterUserCommand } from './register-user.command.js';

/**
 * Handler for RegisterUserCommand.
 * Creates a new user and publishes UserRegisteredEvent.
 */
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly authService: AuthService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RegisterUserCommand): Promise<InferCommandResult<RegisterUserCommand>> {
    // Delegate to existing AuthService
    const user = await this.authService.register({
      email: command.email,
      password: command.password,
      name: command.name,
    });

    // Publish event for side effects (welcome email, audit log, etc.)
    await this.eventBus.publish(new UserRegisteredEvent(user));

    return user;
  }
}
