import bcrypt from 'bcrypt';
import { UnauthorizedError } from '../../../plugins/error-handler.js';
import type {
  ICommandBus,
  ICommandHandler,
  IEventBus,
  InferCommandResult,
} from '../../../shared/cqrs/index.js';
import { CreateSessionCommand } from '../../security/commands/create-session.command.js';
import { extractRequestMetadata } from '../../security/utils.js';
import { UserLoggedInEvent } from '../events/user-logged-in.event.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { LoginUserCommand, TwoFactorRequiredResult } from './login-user.command.js';

/**
 * Handler for LoginUserCommand.
 * Orchestrates credential verification, 2FA check, session creation, and event publication.
 *
 * Note: JWT token generation is handled by the route layer (HTTP-specific).
 */
export class LoginUserHandler implements ICommandHandler<LoginUserCommand> {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly commandBus: ICommandBus,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: LoginUserCommand): Promise<InferCommandResult<LoginUserCommand>> {
    // Find user by email
    const user = await this.authRepository.findByEmailWithPassword(command.email);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is passwordless
    if (!user.password) {
      throw new UnauthorizedError('Please sign in with your passkey');
    }

    // Verify password
    const validPassword = await bcrypt.compare(command.password, user.password);

    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

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

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      sessionId: session.id,
    };
  }
}
