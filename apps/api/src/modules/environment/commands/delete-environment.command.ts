import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to delete an environment.
 *
 * Result type is void (no return value).
 */
export class DeleteEnvironmentCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Environment ID to delete */
    public readonly id: string,
    /** User ID performing the action (for activity logging) */
    public readonly userId: string
  ) {}
}
