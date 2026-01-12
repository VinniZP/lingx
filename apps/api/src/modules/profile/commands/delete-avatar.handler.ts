import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { FileStorageService } from '../../../shared/infrastructure/file-storage.service.js';
import { AvatarDeletedEvent } from '../events/avatar-deleted.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import type { DeleteAvatarCommand } from './delete-avatar.command.js';

/**
 * Handler for DeleteAvatarCommand.
 * Deletes the user's avatar file and emits AvatarDeletedEvent.
 */
export class DeleteAvatarHandler implements ICommandHandler<DeleteAvatarCommand> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly fileStorage: FileStorageService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteAvatarCommand): Promise<InferCommandResult<DeleteAvatarCommand>> {
    const { userId } = command;

    // Check if user exists
    const user = await this.profileRepository.findByIdSimple(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Only delete if user has an avatar
    if (user.avatarUrl) {
      const previousAvatarUrl = user.avatarUrl;

      // Delete file from storage
      await this.fileStorage.deleteAvatar(previousAvatarUrl);

      // Update user
      await this.profileRepository.updateAvatar(userId, null);

      // Emit event
      await this.eventBus.publish(new AvatarDeletedEvent(userId, previousAvatarUrl));
    }
  }
}
