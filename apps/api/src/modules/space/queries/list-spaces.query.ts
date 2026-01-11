import type { Space } from '@prisma/client';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to list all spaces for a project.
 */
export class ListSpacesQuery implements IQuery<Space[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: Space[];

  constructor(
    /** Project ID or slug (flexible lookup) */
    public readonly projectId: string,
    /** ID of the user requesting the spaces */
    public readonly userId: string
  ) {}
}
