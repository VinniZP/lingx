import type { IQuery } from '../../../shared/cqrs/index.js';
import type { BranchTranslations } from '../repositories/translation.repository.js';

/**
 * Query to get all translations for a branch (for CLI pull).
 */
export class GetBranchTranslationsQuery implements IQuery<BranchTranslations> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: BranchTranslations;

  constructor(
    public readonly branchId: string,
    public readonly userId: string
  ) {}
}
