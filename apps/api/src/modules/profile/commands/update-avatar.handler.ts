import { NotFoundError } from '../../../plugins/error-handler.js';
import type { FileStorageService } from '../../../services/file-storage.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { AvatarUpdatedEvent } from '../events/avatar-updated.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import type { UpdateAvatarCommand } from './update-avatar.command.js';

/**
 * Handler for UpdateAvatarCommand.
 * Uploads a new avatar, deletes old one if exists, and emits AvatarUpdatedEvent.
 */
export class UpdateAvatarHandler implements ICommandHandler<UpdateAvatarCommand> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly fileStorage: FileStorageService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: UpdateAvatarCommand): Promise<InferCommandResult<UpdateAvatarCommand>> {
    const { userId, file } = command;

    // Check if user exists
    const user = await this.profileRepository.findByIdSimple(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const previousAvatarUrl = user.avatarUrl;

    // Save new avatar first (ensures user always has an avatar if upload succeeds)
    const result = await this.fileStorage.saveAvatar(userId, file);

    // Update user
    await this.profileRepository.updateAvatar(userId, result.publicUrl);

    // Delete old avatar after successful update (best-effort, don't fail if delete fails)
    if (previousAvatarUrl) {
      try {
        await this.fileStorage.deleteAvatar(previousAvatarUrl);
      } catch {
        // Orphaned file is preferable to failed upload - log but don't fail
        console.warn('Failed to delete previous avatar:', { previousAvatarUrl, userId });
      }
    }

    // Emit event
    await this.eventBus.publish(
      new AvatarUpdatedEvent(userId, result.publicUrl, previousAvatarUrl)
    );

    return { avatarUrl: result.publicUrl };
  }
}
