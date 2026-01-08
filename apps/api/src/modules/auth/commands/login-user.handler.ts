import type { AuthService } from '../../../services/auth.service.js';
import type { SecurityService } from '../../../services/security.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
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
    private readonly securityService: SecurityService,
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
    const session = await this.securityService.createSession(user.id, command.request);

    // Publish event for side effects (audit log, notifications, etc.)
    await this.eventBus.publish(new UserLoggedInEvent(user.id, session.id));

    return {
      user,
      sessionId: session.id,
    };
  }
}
