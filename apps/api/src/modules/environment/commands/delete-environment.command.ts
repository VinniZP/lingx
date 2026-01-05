import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to delete an environment.
 */
export class DeleteEnvironmentCommand implements ICommand {
  readonly __brand = 'command' as const;

  constructor(
    /** Environment ID to delete */
    public readonly id: string,
    /** User ID performing the action (for activity logging) */
    public readonly userId: string
  ) {}
}

/**
 * Result type for DeleteEnvironmentCommand.
 */
export type DeleteEnvironmentResult = void;
