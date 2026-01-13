import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import { EnvironmentDeletedEvent } from '../events/environment-deleted.event.js';
import type { DeleteEnvironmentCommand } from './delete-environment.command.js';

/**
 * Handler for DeleteEnvironmentCommand.
 * Deletes an environment and publishes EnvironmentDeletedEvent.
 *
 * Authorization: Requires MANAGER or OWNER role on the project.
 */
export class DeleteEnvironmentHandler implements ICommandHandler<DeleteEnvironmentCommand> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventBus: IEventBus,
    private readonly accessService: AccessService
  ) {}

  async execute(command: DeleteEnvironmentCommand): Promise<void> {
    const { id, userId } = command;

    // Get existing environment for event data
    const existing = await this.environmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Environment');
    }

    // Authorization: requires MANAGER or OWNER role
    await this.accessService.verifyProjectAccess(userId, existing.projectId, ['MANAGER', 'OWNER']);

    const { name: environmentName, projectId } = existing;

    // Delete the environment
    await this.environmentRepository.delete(id);

    // Publish event for side effects (activity logging, etc.)
    await this.eventBus.publish(
      new EnvironmentDeletedEvent(id, environmentName, projectId, userId)
    );
  }
}
