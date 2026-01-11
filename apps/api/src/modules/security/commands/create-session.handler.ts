import type { Session } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, IEventBus } from '../../../shared/cqrs/index.js';
import { SessionCreatedEvent } from '../events/session-created.event.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';
import { parseUserAgent } from '../utils.js';
import type { CreateSessionCommand } from './create-session.command.js';

/**
 * Handler for CreateSessionCommand.
 * Creates a session, caches it, and publishes SessionCreatedEvent.
 */
export class CreateSessionHandler implements ICommandHandler<CreateSessionCommand> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: CreateSessionCommand): Promise<Session> {
    const deviceInfo = command.userAgent ? parseUserAgent(command.userAgent) : null;

    const session = await this.sessionRepository.create({
      userId: command.userId,
      userAgent: command.userAgent,
      deviceInfo,
      ipAddress: command.ipAddress,
    });

    // Cache the session for fast validation (non-critical - DB is source of truth)
    try {
      await this.sessionCacheService.setValid(session.id, session.userId);
    } catch (err) {
      this.logger.warn(
        { err, sessionId: session.id },
        'Failed to cache new session - falling back to database validation'
      );
    }

    // Publish event for side effects (activity logging, etc.)
    await this.eventBus.publish(
      new SessionCreatedEvent(session.id, session.userId, session.deviceInfo, session.ipAddress)
    );

    return session;
  }
}
