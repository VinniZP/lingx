import type { SecurityService, SessionInfo } from '../../../services/security.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GetSessionsQuery } from './get-sessions.query.js';

/**
 * Handler for GetSessionsQuery.
 * Returns all active sessions for a user.
 */
export class GetSessionsHandler implements IQueryHandler<GetSessionsQuery> {
  constructor(private readonly securityService: SecurityService) {}

  async execute(query: GetSessionsQuery): Promise<InferQueryResult<GetSessionsQuery>> {
    return this.securityService.getSessions(query.userId, query.currentSessionId);
  }
}

export type { SessionInfo };
