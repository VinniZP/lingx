import type { FastifyBaseLogger } from 'fastify';
import type { IQueryHandler } from '../../../shared/cqrs/index.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';
import type { ValidateSessionQuery } from './validate-session.query.js';

/**
 * Handler for ValidateSessionQuery.
 * Checks Redis cache first, falls back to database if cache miss.
 * Populates cache on successful database lookup.
 * Cache operations are non-critical - DB is source of truth.
 */
export class ValidateSessionHandler implements IQueryHandler<ValidateSessionQuery> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(query: ValidateSessionQuery): Promise<boolean> {
    // Check cache first (non-critical - fall back to DB on error)
    try {
      const cachedUserId = await this.sessionCacheService.isValid(query.sessionId);
      if (cachedUserId) {
        return true;
      }
    } catch (err) {
      this.logger.warn(
        { err, sessionId: query.sessionId },
        'Session cache read failed - checking database'
      );
    }

    // Cache miss or error - check database
    const session = await this.sessionRepository.findValidById(query.sessionId);
    if (!session) {
      return false;
    }

    // Populate cache for future requests (non-critical)
    try {
      await this.sessionCacheService.setValid(session.id, session.userId);
    } catch (err) {
      this.logger.warn({ err, sessionId: session.id }, 'Failed to populate session cache');
    }

    return true;
  }
}
