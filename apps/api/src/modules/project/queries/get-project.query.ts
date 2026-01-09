import type { ProjectRole } from '@prisma/client';
import type { IQuery } from '../../../shared/cqrs/index.js';
import type { ProjectWithLanguages } from '../project.repository.js';

/**
 * Result of GetProjectQuery.
 */
export interface GetProjectResult {
  project: ProjectWithLanguages;
  role: ProjectRole;
}

/**
 * Query to get a project by ID or slug.
 */
export class GetProjectQuery implements IQuery<GetProjectResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetProjectResult;

  constructor(
    /** Project ID or slug */
    public readonly projectIdOrSlug: string,
    /** User ID requesting access */
    public readonly userId: string
  ) {}
}
