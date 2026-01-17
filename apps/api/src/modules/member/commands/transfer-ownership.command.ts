import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to transfer ownership of a project.
 *
 * Permission rules:
 * - Only OWNER can transfer ownership
 *
 * Logic:
 * - Target must be an existing project member
 * - Target becomes OWNER
 * - If keepOwnership=false AND multiple owners, current owner is demoted to MANAGER
 */
export class TransferOwnershipCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** User ID to become the new owner */
    public readonly newOwnerId: string,
    /** Current owner making the transfer */
    public readonly currentOwnerId: string,
    /** Whether current owner should remain an OWNER */
    public readonly keepOwnership: boolean
  ) {}
}
