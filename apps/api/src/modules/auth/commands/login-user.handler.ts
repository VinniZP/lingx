import type { AuthService } from '../../../services/auth.service.js';
import type {
  ICommandBus,
  ICommandHandler,
  IEventBus,
  InferCommandResult,
} from '../../../shared/cqrs/index.js';
import { CreateSessionCommand } from '../../security/commands/create-session.command.js';
import { extractRequestMetadata } from '../../security/utils.js';
import { UserLoggedInEvent } from '../events/user-logged-in.event.js';
import type { LoginUserCommand, TwoFactorRequiredResult } from './login-user.command.js';

/**
 * Handler for LoginUserCommand.
 * Authenticates user and either creates session or requests 2FA.
 *
 * Note: JWT token generation is handled by the route layer (HTTP-specific).
 */
export class LoginUserHandler implements ICommandHandler<LoginUserCommand> {
  constructor(
    private readonly authService: AuthService,
    private readonly commandBus: ICommandBus,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: LoginUserCommand): Promise<InferCommandResult<LoginUserCommand>> {
    // Verify credentials via AuthService
    const user = await this.authService.login({
      email: command.email,
      password: command.password,
    });

    // Check if 2FA is required
    if (user.totpEnabled && !command.isDeviceTrusted) {
      // Return userId so route can generate tempToken
      return {
        requiresTwoFactor: true,
        userId: user.id,
      } as TwoFactorRequiredResult;
    }

    // No 2FA or device is trusted - create session
    const { userAgent, ipAddress } = extractRequestMetadata(command.request);
    const session = await this.commandBus.execute(
      new CreateSessionCommand(user.id, userAgent, ipAddress)
    );

    // Publish event for side effects (audit log, notifications, etc.)
    await this.eventBus.publish(new UserLoggedInEvent(user.id, session.id));

    return {
      user,
      sessionId: session.id,
    };
  }
}
