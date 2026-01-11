import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to cancel a pending email change.
 */
export class CancelEmailChangeCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** User ID cancelling the email change */
    public readonly userId: string
  ) {}
}
