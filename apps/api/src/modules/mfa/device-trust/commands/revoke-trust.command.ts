/**
 * RevokeTrustCommand
 *
 * Revokes device trust for a specific session.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export class RevokeTrustCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    public readonly sessionId: string,
    public readonly userId: string
  ) {}
}
