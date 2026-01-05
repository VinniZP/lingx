import type { ICommand } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Command to create a new environment.
 */
export class CreateEnvironmentCommand implements ICommand {
  readonly __brand = 'command' as const;

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

/**
 * Result type for CreateEnvironmentCommand.
 */
export type CreateEnvironmentResult = EnvironmentWithBranch;
