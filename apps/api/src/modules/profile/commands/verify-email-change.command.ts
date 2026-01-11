import type { ICommand } from '../../../shared/cqrs/index.js';
import type { UserProfile } from '../types.js';

/**
 * Command to verify an email change with token.
 *
 * Returns the updated user profile.
 */
export class VerifyEmailChangeCommand implements ICommand<UserProfile> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: UserProfile;

  constructor(
    /** Verification token from email */
    public readonly token: string
  ) {}
}
