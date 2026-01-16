import { BadRequestError, ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { UserDisabledEvent } from '../events/user-disabled.event.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { DisableUserCommand } from './disable-user.command.js';

/**
 * Handler for DisableUserCommand.
 * Disables a user account with all side effects (session invalidation, anonymization).
 * All operations are performed atomically in a single transaction.
 */
export class DisableUserHandler implements ICommandHandler<DisableUserCommand> {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DisableUserCommand): Promise<InferCommandResult<DisableUserCommand>> {
    const { targetUserId, actorId, requestContext } = command;

    // 1. Verify actor is an admin
    const actorRole = await this.adminRepository.findUserRoleById(actorId);
    if (!actorRole) {
      throw new NotFoundError('User not found');
    }
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // 2. Cannot disable self
    if (targetUserId === actorId) {
      throw new BadRequestError('Cannot disable yourself');
    }

    // 3. Get target user (for role check and before state)
    const targetUser = await this.adminRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // 4. Cannot disable another ADMIN (safety protection)
    if (targetUser.role === 'ADMIN') {
      throw new BadRequestError('Cannot disable another admin');
    }

    // 5. Capture before state for audit
    const beforeState = {
      isDisabled: targetUser.isDisabled,
      disabledAt: targetUser.disabledAt?.toISOString() ?? null,
    };

    // 6. Disable the user, delete sessions, anonymize activity - all in one transaction
    await this.adminRepository.disableUserTransaction(targetUserId, actorId);

    // 7. Capture after state for audit
    const afterState = {
      isDisabled: true,
      disabledAt: new Date().toISOString(),
    };

    // 8. Emit event with audit data
    await this.eventBus.publish(
      new UserDisabledEvent(targetUserId, actorId, true, requestContext, beforeState, afterState)
    );
  }
}
