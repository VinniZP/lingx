import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to batch approve/reject multiple translations (all-or-nothing).
 * Only MANAGER or OWNER roles can approve/reject.
 */
export class BatchApprovalCommand implements ICommand<number> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: number;

  constructor(
    public readonly branchId: string,
    public readonly translationIds: string[],
    public readonly status: 'APPROVED' | 'REJECTED',
    public readonly userId: string
  ) {}
}
