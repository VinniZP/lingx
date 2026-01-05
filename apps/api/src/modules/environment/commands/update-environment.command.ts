import type { ICommand } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Command to update an environment.
 */
export class UpdateEnvironmentCommand implements ICommand {
  readonly __brand = 'command' as const;

  constructor(
    /** Environment ID to update */
    public readonly id: string,
    /** New environment name (optional) */
    public readonly name?: string
  ) {}
}

/**
 * Result type for UpdateEnvironmentCommand.
 */
export type UpdateEnvironmentResult = EnvironmentWithBranch;
