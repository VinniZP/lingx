import type { SessionInfo } from '../../../services/security.service.js';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to get all active sessions for a user.
 */
export class GetSessionsQuery implements IQuery<SessionInfo[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: SessionInfo[];

  constructor(
    public readonly userId: string,
    public readonly currentSessionId: string
  ) {}
}
