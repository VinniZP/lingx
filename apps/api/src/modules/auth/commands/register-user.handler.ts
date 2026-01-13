import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import bcrypt from 'bcrypt';
import { FieldValidationError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { UserRegisteredEvent } from '../events/user-registered.event.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { RegisterUserCommand } from './register-user.command.js';

/** bcrypt cost factor per Design Doc NFRs */
const BCRYPT_ROUNDS = 12;

/**
 * Handler for RegisterUserCommand.
 * Orchestrates email validation, password hashing, user creation, and event publication.
 */
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RegisterUserCommand): Promise<InferCommandResult<RegisterUserCommand>> {
    // Check for existing user
    const emailExists = await this.authRepository.emailExists(command.email);

    if (emailExists) {
      throw new FieldValidationError(
        [
          {
            field: 'email',
            message: 'This email is already registered',
            code: UNIQUE_VIOLATION_CODES.USER_EMAIL,
          },
        ],
        'Email already registered'
      );
    }

    // Hash password with cost factor 12
    const hashedPassword = await bcrypt.hash(command.password, BCRYPT_ROUNDS);

    // Create user via repository
    const user = await this.authRepository.create({
      email: command.email,
      password: hashedPassword,
      name: command.name,
    });

    // Publish event for side effects (welcome email, audit log, etc.)
    await this.eventBus.publish(new UserRegisteredEvent(user));

    return user;
  }
}
