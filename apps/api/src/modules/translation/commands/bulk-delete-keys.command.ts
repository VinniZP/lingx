import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to bulk delete translation keys (all-or-nothing).
 */
export class BulkDeleteKeysCommand implements ICommand<number> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: number;

  constructor(
    public readonly branchId: string,
    public readonly keyIds: string[],
    public readonly userId: string
  ) {}
}
