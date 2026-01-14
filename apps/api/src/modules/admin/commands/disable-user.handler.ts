import { BadRequestError, ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { UserDisabledEvent } from '../events/user-disabled.event.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { DisableUserCommand } from './disable-user.command.js';

/** Interface for session repository dependency */
interface SessionRepositoryLike {
  deleteAllByUserId(userId: string): Promise<number>;
}

/**
 * Handler for DisableUserCommand.
 * Disables a user account with all side effects (session invalidation, anonymization).
 */
export class DisableUserHandler implements ICommandHandler<DisableUserCommand> {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly sessionRepository: SessionRepositoryLike,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DisableUserCommand): Promise<InferCommandResult<DisableUserCommand>> {
    const { targetUserId, actorId } = command;

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

    // 3. Get target user role
    const targetRole = await this.adminRepository.findUserRoleById(targetUserId);
    if (!targetRole) {
      throw new NotFoundError('User not found');
    }

    // 4. Cannot disable another ADMIN (safety protection)
    if (targetRole === 'ADMIN') {
      throw new BadRequestError('Cannot disable another admin');
    }

    // 5. Disable the user
    await this.adminRepository.updateUserDisabled(targetUserId, true, actorId);

    // 6. Delete all sessions (immediate logout)
    await this.sessionRepository.deleteAllByUserId(targetUserId);

    // 7. Anonymize user in activity logs (GDPR)
    await this.adminRepository.anonymizeUserActivity(targetUserId);

    // 8. Emit event
    await this.eventBus.publish(new UserDisabledEvent(targetUserId, actorId, true));
  }
}
