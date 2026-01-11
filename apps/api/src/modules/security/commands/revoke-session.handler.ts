import { BadRequestError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../shared/cqrs/index.js';
import { SessionRevokedEvent } from '../events/session-revoked.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';
import type { RevokeSessionCommand } from './revoke-session.command.js';

/**
 * Handler for RevokeSessionCommand.
 * Revokes a specific session (not the current one) and publishes event.
 */
export class RevokeSessionHandler implements ICommandHandler<RevokeSessionCommand> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RevokeSessionCommand): Promise<void> {
    // Cannot revoke current session (use logout instead)
    if (command.targetSessionId === command.currentSessionId) {
      throw new BadRequestError('Cannot revoke current session. Use logout instead.');
    }

    // Find session and verify ownership
    const session = await this.sessionRepository.findByIdAndUserId(
      command.targetSessionId,
      command.userId
    );

    if (!session) {
      throw new BadRequestError('Session not found');
    }

    // Delete the session
    await this.sessionRepository.delete(command.targetSessionId);

    // Invalidate cache
    await this.sessionCacheService.invalidate(command.targetSessionId);

    // Publish event
    await this.eventBus.publish(new SessionRevokedEvent(command.userId, command.targetSessionId));
  }
}
