import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { EmailChangeCancelledEvent } from '../events/email-change-cancelled.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import type { CancelEmailChangeCommand } from './cancel-email-change.command.js';

/**
 * Handler for CancelEmailChangeCommand.
 * Deletes pending email verifications for the user.
 */
export class CancelEmailChangeHandler implements ICommandHandler<CancelEmailChangeCommand> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: CancelEmailChangeCommand
  ): Promise<InferCommandResult<CancelEmailChangeCommand>> {
    const { userId } = command;

    // Delete any pending email verifications
    await this.profileRepository.deleteUserEmailVerifications(userId);

    // Emit event
    await this.eventBus.publish(new EmailChangeCancelledEvent(userId));
  }
}
