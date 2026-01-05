import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import { EnvironmentUpdatedEvent } from '../events/environment-updated.event.js';
import type { UpdateEnvironmentCommand } from './update-environment.command.js';

/**
 * Handler for UpdateEnvironmentCommand.
 * Updates an environment and publishes EnvironmentUpdatedEvent.
 *
 * Authorization: Requires MANAGER or OWNER role on the project.
 */
export class UpdateEnvironmentHandler implements ICommandHandler<UpdateEnvironmentCommand> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventBus: IEventBus,
    private readonly accessService: AccessService
  ) {}

  async execute(
    command: UpdateEnvironmentCommand
  ): Promise<InferCommandResult<UpdateEnvironmentCommand>> {
    const { id, userId, name } = command;

    // Verify environment exists
    const existing = await this.environmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Environment');
    }

    // Authorization: requires MANAGER or OWNER role
    await this.accessService.verifyProjectAccess(userId, existing.projectId, ['MANAGER', 'OWNER']);

    const previousName = existing.name;

    // Update the environment
    const environment = await this.environmentRepository.update(id, { name });

    // Publish event for side effects
    await this.eventBus.publish(new EnvironmentUpdatedEvent(environment, userId, previousName));

    return environment;
  }
}
