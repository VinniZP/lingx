import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { SessionRepository } from '../session.repository.js';
import { maskIpAddress } from '../utils.js';
import type { GetSessionsQuery } from './get-sessions.query.js';

/**
 * Handler for GetSessionsQuery.
 * Returns all active sessions for a user with masked IP addresses.
 */
export class GetSessionsHandler implements IQueryHandler<GetSessionsQuery> {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(query: GetSessionsQuery): Promise<InferQueryResult<GetSessionsQuery>> {
    const sessions = await this.sessionRepository.findByUserId(query.userId);

    return sessions.map((session) => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: maskIpAddress(session.ipAddress),
      lastActive: session.lastActive.toISOString(),
      createdAt: session.createdAt.toISOString(),
      isCurrent: session.id === query.currentSessionId,
    }));
  }
}
