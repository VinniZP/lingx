import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command for a member to leave a project voluntarily.
 *
 * Constraints:
 * - User must be a member of the project
 * - Sole OWNER cannot leave the project
 */
export class LeaveProjectCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** User ID who is leaving */
    public readonly userId: string
  ) {}
}
