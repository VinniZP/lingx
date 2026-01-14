import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { UserEnabledEvent } from '../events/user-enabled.event.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { EnableUserCommand } from './enable-user.command.js';

/**
 * Handler for EnableUserCommand.
 * Enables a previously disabled user account.
 */
export class EnableUserHandler implements ICommandHandler<EnableUserCommand> {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: EnableUserCommand): Promise<InferCommandResult<EnableUserCommand>> {
    const { targetUserId, actorId } = command;

    // 1. Verify actor is an admin
    const actorRole = await this.adminRepository.findUserRoleById(actorId);
    if (!actorRole) {
      throw new NotFoundError('User not found');
    }
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // 2. Verify target user exists
    const targetRole = await this.adminRepository.findUserRoleById(targetUserId);
    if (!targetRole) {
      throw new NotFoundError('Target user not found');
    }

    // 3. Enable the user (clears disabledAt and disabledById)
    await this.adminRepository.updateUserDisabled(targetUserId, false);

    // 4. Emit event
    await this.eventBus.publish(new UserEnabledEvent(targetUserId, actorId));
  }
}
