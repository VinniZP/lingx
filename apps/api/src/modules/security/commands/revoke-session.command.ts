import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to revoke a specific session.
 * Cannot revoke the current session (use logout instead).
 */
export class RevokeSessionCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    public readonly userId: string,
    public readonly targetSessionId: string,
    public readonly currentSessionId: string
  ) {}
}
