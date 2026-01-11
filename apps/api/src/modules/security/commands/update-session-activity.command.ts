import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to update session last activity timestamp.
 * Fire-and-forget - errors are silently ignored.
 */
export class UpdateSessionActivityCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(public readonly sessionId: string) {}
}
