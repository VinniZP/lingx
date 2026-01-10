import type { IQuery } from '../../../shared/cqrs/index.js';
import type { QualityCheckResults } from '../repositories/translation.repository.js';

/**
 * Query to run quality checks on branch translations.
 */
export class CheckBranchQualityQuery implements IQuery<QualityCheckResults> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: QualityCheckResults;

  constructor(
    public readonly branchId: string,
    public readonly userId: string,
    public readonly keyIds?: string[]
  ) {}
}
