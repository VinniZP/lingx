import type { ICommand } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Command to update an environment.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class UpdateEnvironmentCommand implements ICommand<EnvironmentWithBranch> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: EnvironmentWithBranch;

  constructor(
    /** Environment ID to update */
    public readonly id: string,
    /** User ID performing the action (for authorization and activity logging) */
    public readonly userId: string,
    /** New environment name (optional) */
    public readonly name?: string
  ) {}
}
