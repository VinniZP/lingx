import { BadRequestError, ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { UserImpersonatedEvent } from '../events/user-impersonated.event.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { ImpersonateUserCommand } from './impersonate-user.command.js';

/** Interface for JWT service dependency */
interface JwtServiceLike {
  sign(payload: Record<string, unknown>, options: { expiresIn: string }): string;
}

/** Impersonation token expiry duration */
const IMPERSONATION_EXPIRY = '1h';
const IMPERSONATION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Handler for ImpersonateUserCommand.
 * Generates a short-lived JWT for admin impersonation.
 */
export class ImpersonateUserHandler implements ICommandHandler<ImpersonateUserCommand> {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly jwtService: JwtServiceLike,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: ImpersonateUserCommand
  ): Promise<InferCommandResult<ImpersonateUserCommand>> {
    const { targetUserId, actorId } = command;

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

    // 4. Generate impersonation token
    const expiresAt = new Date(Date.now() + IMPERSONATION_EXPIRY_MS);
    const token = this.jwtService.sign(
      {
        userId: targetUserId,
        impersonatedBy: actorId,
        purpose: 'impersonation',
      },
      { expiresIn: IMPERSONATION_EXPIRY }
    );

    // 5. Emit event for audit trail
    await this.eventBus.publish(new UserImpersonatedEvent(targetUserId, actorId, expiresAt));

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
