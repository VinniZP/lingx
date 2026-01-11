import type { ICommand } from '../../../shared/cqrs/index.js';
import type { UpdatePreferencesInput, UserPreferences } from '../types.js';

/**
 * Command to update a user's preferences.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class UpdatePreferencesCommand implements ICommand<UserPreferences> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: UserPreferences;

  constructor(
    /** User ID to update */
    public readonly userId: string,
    /** Preferences update data */
    public readonly input: UpdatePreferencesInput
  ) {}
}
