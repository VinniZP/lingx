import type { IQuery } from '../../../shared/cqrs/index.js';
import type { UserProfile } from '../types.js';

/**
 * Query to get a user's profile by ID.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class GetProfileQuery implements IQuery<UserProfile> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: UserProfile;

  constructor(
    /** User ID to retrieve profile for */
    public readonly userId: string
  ) {}
}
