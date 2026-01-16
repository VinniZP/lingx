import { BadRequestError, ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { UserImpersonatedEvent } from '../events/user-impersonated.event.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { ImpersonateUserCommand } from './impersonate-user.command.js';

/** Impersonation token expiry duration in milliseconds */
const IMPERSONATION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Handler for ImpersonateUserCommand.
 * Validates permissions and returns data for JWT generation (signing happens in route).
 *
 * Note: JWT token generation is handled by the route layer (HTTP-specific).
 */
export class ImpersonateUserHandler implements ICommandHandler<ImpersonateUserCommand> {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: ImpersonateUserCommand
  ): Promise<InferCommandResult<ImpersonateUserCommand>> {
    const { targetUserId, actorId, requestContext } = command;

    // 1. Verify actor is an admin
    const actorRole = await this.adminRepository.findUserRoleById(actorId);
    if (!actorRole) {
      throw new NotFoundError('User not found');
    }
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // 2. Cannot impersonate self
    if (targetUserId === actorId) {
      throw new BadRequestError('Cannot impersonate yourself');
    }

    // 3. Get target user and verify not disabled
    const targetUser = await this.adminRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }
    if (targetUser.isDisabled) {
      throw new BadRequestError('Cannot impersonate a disabled user');
    }

    // 4. Calculate expiry time
    const expiresAt = new Date(Date.now() + IMPERSONATION_EXPIRY_MS);

    // 5. Capture target user state for audit
    const targetUserState = {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
    };

    // 6. Emit event for audit trail
    await this.eventBus.publish(
      new UserImpersonatedEvent(targetUserId, actorId, expiresAt, requestContext, targetUserState)
    );

    // Return validation result - JWT signing happens in route layer
    return {
      targetUserId,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      actorId,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
