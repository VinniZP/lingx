import type { ICommand } from '../../../shared/cqrs/index.js';
import type { BulkUpdateResult } from '../repositories/translation.repository.js';

/**
 * Command to bulk update translations for a branch (CLI push, all-or-nothing).
 */
export class BulkUpdateTranslationsCommand implements ICommand<BulkUpdateResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: BulkUpdateResult;

  constructor(
    public readonly branchId: string,
    public readonly translations: Record<string, Record<string, string>>,
    public readonly userId: string
  ) {}
}
