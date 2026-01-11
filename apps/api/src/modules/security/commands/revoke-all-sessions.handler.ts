import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { AllSessionsRevokedEvent } from '../events/all-sessions-revoked.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';
import type { RevokeAllSessionsCommand } from './revoke-all-sessions.command.js';

/**
 * Handler for RevokeAllSessionsCommand.
 * Revokes all sessions except current and publishes event.
 */
export class RevokeAllSessionsHandler implements ICommandHandler<RevokeAllSessionsCommand> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: RevokeAllSessionsCommand
  ): Promise<InferCommandResult<RevokeAllSessionsCommand>> {
    // Delete all sessions except current
    const revokedCount = await this.sessionRepository.deleteAllExcept(
      command.userId,
      command.currentSessionId
    );

    // Invalidate all cached sessions except current
    await this.sessionCacheService.invalidateAllExcept(command.userId, command.currentSessionId);

    // Publish event
    await this.eventBus.publish(
      new AllSessionsRevokedEvent(command.userId, revokedCount, command.currentSessionId)
    );

    return { revokedCount };
  }
}
