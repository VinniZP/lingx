import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ProfileUpdatedEvent } from '../events/profile-updated.event.js';
import { toUserProfile } from '../mappers/profile.mapper.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import type { UpdateProfileCommand } from './update-profile.command.js';

/**
 * Handler for UpdateProfileCommand.
 * Updates a user's profile name and emits ProfileUpdatedEvent.
 */
export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: UpdateProfileCommand): Promise<InferCommandResult<UpdateProfileCommand>> {
    const { userId, input } = command;

    // Check if user exists
    const existingUser = await this.profileRepository.findByIdSimple(userId);
    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Update profile
    const updated = await this.profileRepository.updateProfile(userId, {
      ...(input.name !== undefined && { name: input.name || null }),
    });

    const profile = toUserProfile(updated);

    // Emit event
    await this.eventBus.publish(
      new ProfileUpdatedEvent(profile, userId, {
        name: input.name !== undefined,
      })
    );

    return profile;
  }
}
