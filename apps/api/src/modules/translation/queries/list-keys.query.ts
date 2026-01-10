import type { IQuery } from '../../../shared/cqrs/index.js';
import type {
  KeyFilter,
  KeyListResult,
  QualityFilter,
} from '../repositories/translation.repository.js';

export interface ListKeysOptions {
  search?: string;
  page?: number;
  limit?: number;
  filter?: KeyFilter;
  qualityFilter?: QualityFilter;
  namespace?: string;
}

/**
 * Query to list translation keys with pagination, search, and filters.
 */
export class ListKeysQuery implements IQuery<KeyListResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: KeyListResult;

  constructor(
    public readonly branchId: string,
    public readonly userId: string,
    public readonly options: ListKeysOptions
  ) {}
}
