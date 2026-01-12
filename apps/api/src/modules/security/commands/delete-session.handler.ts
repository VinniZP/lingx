import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, IEventBus } from '../../../shared/cqrs/index.js';
import { SessionDeletedEvent } from '../events/session-deleted.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';
import type { DeleteSessionCommand } from './delete-session.command.js';

/**
 * Handler for DeleteSessionCommand.
 * Deletes a session, invalidates cache, and publishes SessionDeletedEvent.
 */
export class DeleteSessionHandler implements ICommandHandler<DeleteSessionCommand> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: DeleteSessionCommand): Promise<void> {
    // Delete from database (may already be deleted)
    await this.sessionRepository.delete(command.sessionId);

    // Invalidate cache (non-critical - log errors but continue)
    try {
      await this.sessionCacheService.invalidate(command.sessionId);
    } catch (err) {
      this.logger.warn(
        { err, sessionId: command.sessionId },
        'Failed to invalidate session cache during deletion'
      );
    }

    // Publish event for side effects
    await this.eventBus.publish(new SessionDeletedEvent(command.sessionId, command.userId));
  }
}
