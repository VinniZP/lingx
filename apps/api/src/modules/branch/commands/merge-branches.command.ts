import type { ICommand } from '../../../shared/cqrs/index.js';
import type { MergeResult, Resolution } from '../services/merge-executor.js';

/**
 * Command to merge source branch into target branch.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class MergeBranchesCommand implements ICommand<MergeResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: MergeResult;

  constructor(
    /** Source branch ID (the one with changes to merge) */
    public readonly sourceBranchId: string,
    /** Target branch ID (the one receiving changes) */
    public readonly targetBranchId: string,
    /** Optional conflict resolutions */
    public readonly resolutions: Resolution[] | undefined,
    /** User ID performing the action */
    public readonly userId: string
  ) {}
}
