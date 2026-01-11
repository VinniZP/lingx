import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to delete a session (logout).
 * Includes userId for audit trail in the deletion event.
 */
export class DeleteSessionCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    public readonly sessionId: string,
    public readonly userId: string
  ) {}
}
