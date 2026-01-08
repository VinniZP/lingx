import type { ICommand } from '../../../shared/cqrs/index.js';

export interface RevokeAllSessionsResult {
  revokedCount: number;
}

/**
 * Command to revoke all sessions except the current one.
 */
export class RevokeAllSessionsCommand implements ICommand<RevokeAllSessionsResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: RevokeAllSessionsResult;

  constructor(
    public readonly userId: string,
    public readonly currentSessionId: string
  ) {}
}
