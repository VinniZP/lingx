import type { IQuery } from '../../../shared/cqrs/index.js';
import type { GlossaryTagWithCount } from '../repositories/glossary.repository.js';

export interface ListTagsResult {
  tags: GlossaryTagWithCount[];
}

/**
 * Query to list all glossary tags for a project.
 */
export class ListTagsQuery implements IQuery<ListTagsResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ListTagsResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
