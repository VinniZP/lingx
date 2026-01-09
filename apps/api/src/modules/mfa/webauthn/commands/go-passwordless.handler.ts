/**
 * GoPasswordlessHandler
 *
 * Removes password, requiring at least 2 passkeys for safety.
 */
import { BadRequestError, UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { WentPasswordlessEvent } from '../../events/went-passwordless.event.js';
import { MIN_PASSKEYS_FOR_PASSWORDLESS } from '../../shared/constants.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import { GoPasswordlessCommand, type GoPasswordlessResult } from './go-passwordless.command.js';

export class GoPasswordlessHandler implements ICommandHandler<GoPasswordlessCommand> {
  constructor(
    private readonly repository: WebAuthnRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: GoPasswordlessCommand): Promise<GoPasswordlessResult> {
    const user = await this.repository.findUserForPasswordCheck(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.password === null) {
      throw new BadRequestError('You are already passwordless');
    }

    const credentialsCount = await this.repository.countCredentials(command.userId);

    if (credentialsCount < MIN_PASSKEYS_FOR_PASSWORDLESS) {
      throw new BadRequestError(
        `You need at least ${MIN_PASSKEYS_FOR_PASSWORDLESS} passkeys to go passwordless. ` +
          `You currently have ${credentialsCount}.`
      );
    }

    // Remove password
    await this.repository.setPasswordless(command.userId);

    // Publish event
    await this.eventBus.publish(new WentPasswordlessEvent(command.userId));

    return { success: true };
  }
}
