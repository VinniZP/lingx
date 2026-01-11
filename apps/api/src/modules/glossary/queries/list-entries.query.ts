import type { GlossaryListQuery } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';
import type { GlossaryEntryWithRelations } from '../repositories/glossary.repository.js';

export interface ListEntriesResult {
  entries: GlossaryEntryWithRelations[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Query to list glossary entries with filtering and pagination.
 */
export class ListEntriesQuery implements IQuery<ListEntriesResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ListEntriesResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly filters: GlossaryListQuery
  ) {}
}
