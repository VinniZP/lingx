import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import { EnvironmentDeletedEvent } from '../events/environment-deleted.event.js';
import type {
  DeleteEnvironmentCommand,
  DeleteEnvironmentResult,
} from './delete-environment.command.js';

/**
 * Handler for DeleteEnvironmentCommand.
 * Deletes an environment and publishes EnvironmentDeletedEvent.
 */
export class DeleteEnvironmentHandler implements ICommandHandler<
  DeleteEnvironmentCommand,
  DeleteEnvironmentResult
> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteEnvironmentCommand): Promise<void> {
    const { id, userId } = command;

    // Get existing environment for event data
    const existing = await this.environmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Environment');
    }

    const { name: environmentName, projectId } = existing;

    // Delete the environment
    await this.environmentRepository.delete(id);

    // Publish event for side effects (activity logging, etc.)
    await this.eventBus.publish(
      new EnvironmentDeletedEvent(id, environmentName, projectId, userId)
    );
  }
}
