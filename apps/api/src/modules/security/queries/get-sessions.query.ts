import type { IQuery } from '../../../shared/cqrs/index.js';
import type { SessionInfo } from '../session.repository.js';

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
