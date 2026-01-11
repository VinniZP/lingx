import type { ICommand } from '../../../shared/cqrs/index.js';
import type { UpdateProfileInput, UserProfile } from '../types.js';

/**
 * Command to update a user's profile (name only).
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class UpdateProfileCommand implements ICommand<UserProfile> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: UserProfile;

  constructor(
    /** User ID to update */
    public readonly userId: string,
    /** Profile update data */
    public readonly input: UpdateProfileInput
  ) {}
}
