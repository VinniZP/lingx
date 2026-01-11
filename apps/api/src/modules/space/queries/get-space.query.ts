import type { IQuery } from '../../../shared/cqrs/index.js';
import type { SpaceWithBranches } from '../space.repository.js';

/**
 * Query to get a space by ID with branches.
 */
export class GetSpaceQuery implements IQuery<SpaceWithBranches> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: SpaceWithBranches;

  constructor(
    /** Space ID */
    public readonly spaceId: string,
    /** ID of the user requesting the space */
    public readonly userId: string
  ) {}
}
