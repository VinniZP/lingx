import type { ICommand } from '../../../shared/cqrs/index.js';
import type { EnvironmentWithBranch } from '../environment.repository.js';

/**
 * Command to switch an environment's branch pointer.
 */
export class SwitchBranchCommand implements ICommand {
  readonly __brand = 'command' as const;

  constructor(
    /** Environment ID to update */
    public readonly environmentId: string,
    /** New branch ID to point to */
    public readonly branchId: string,
    /** User ID performing the action (for activity logging) */
    public readonly userId: string
  ) {}
}

/**
 * Result type for SwitchBranchCommand.
 */
export type SwitchBranchResult = EnvironmentWithBranch;
