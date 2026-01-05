import type { ICommand } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Command to create a new environment.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class CreateEnvironmentCommand implements ICommand<EnvironmentWithBranch> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: EnvironmentWithBranch;

  constructor(
    /** Environment name */
    public readonly name: string,
    /** Environment slug (unique within project) */
    public readonly slug: string,
    /** Project ID the environment belongs to */
    public readonly projectId: string,
    /** Branch ID the environment points to */
    public readonly branchId: string,
    /** User ID performing the action (for activity logging) */
    public readonly userId: string
  ) {}
}
