import type { IQuery } from '../../../shared/cqrs/index.js';
import type { ProjectTree } from '../project.repository.js';

/**
 * Query to get project navigation tree.
 */
export class GetProjectTreeQuery implements IQuery<ProjectTree> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ProjectTree;

  constructor(
    /** Project ID or slug */
    public readonly projectIdOrSlug: string,
    /** User ID requesting access */
    public readonly userId: string
  ) {}
}
