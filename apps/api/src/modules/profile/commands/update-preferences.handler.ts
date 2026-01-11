import { NotFoundError, ValidationError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { PreferencesUpdatedEvent } from '../events/preferences-updated.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import { DEFAULT_PREFERENCES, type UserPreferences } from '../types.js';
import type { UpdatePreferencesCommand } from './update-preferences.command.js';

/**
 * Handler for UpdatePreferencesCommand.
 * Updates a user's preferences and emits PreferencesUpdatedEvent.
 */
export class UpdatePreferencesHandler implements ICommandHandler<UpdatePreferencesCommand> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: UpdatePreferencesCommand
  ): Promise<InferCommandResult<UpdatePreferencesCommand>> {
    const { userId, input } = command;

    // Check if user exists
    const user = await this.profileRepository.findByIdSimple(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Validate defaultProjectId if provided
    if (input.defaultProjectId) {
      const isMember = await this.profileRepository.isProjectMember(userId, input.defaultProjectId);
      if (!isMember) {
        throw new ValidationError('You are not a member of this project');
      }
    }

    // Merge with existing preferences
    const currentPrefs = (user.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;
    const newPrefs: UserPreferences = {
      theme: input.theme ?? currentPrefs.theme,
      language: input.language ?? currentPrefs.language,
      notifications: {
        email: input.notifications?.email ?? currentPrefs.notifications.email,
        inApp: input.notifications?.inApp ?? currentPrefs.notifications.inApp,
        digestFrequency:
          input.notifications?.digestFrequency ?? currentPrefs.notifications.digestFrequency,
      },
      defaultProjectId:
        input.defaultProjectId !== undefined
          ? input.defaultProjectId
          : currentPrefs.defaultProjectId,
    };

    // Update preferences
    await this.profileRepository.updatePreferences(userId, newPrefs);

    // Emit event
    await this.eventBus.publish(new PreferencesUpdatedEvent(userId, newPrefs));

    return newPrefs;
  }
}
