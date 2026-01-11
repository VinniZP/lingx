import type { IQuery } from '../../../shared/cqrs/index.js';
import type { GlossaryEntryWithRelations } from '../repositories/glossary.repository.js';

export interface GetEntryResult {
  entry: GlossaryEntryWithRelations;
}

/**
 * Query to get a single glossary entry by ID.
 */
export class GetEntryQuery implements IQuery<GetEntryResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetEntryResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly entryId: string
  ) {}
}
