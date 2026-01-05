import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import { EnvironmentUpdatedEvent } from '../events/environment-updated.event.js';
import type {
  UpdateEnvironmentCommand,
  UpdateEnvironmentResult,
} from './update-environment.command.js';

/**
 * Handler for UpdateEnvironmentCommand.
 * Updates an environment and publishes EnvironmentUpdatedEvent.
 */
export class UpdateEnvironmentHandler implements ICommandHandler<
  UpdateEnvironmentCommand,
  UpdateEnvironmentResult
> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: UpdateEnvironmentCommand): Promise<UpdateEnvironmentResult> {
    const { id, name } = command;

    // Verify environment exists
    const existing = await this.environmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Environment');
    }

    const previousName = existing.name;

    // Update the environment
    const environment = await this.environmentRepository.update(id, { name });

    // Publish event for side effects
    await this.eventBus.publish(new EnvironmentUpdatedEvent(environment, previousName));

    return environment;
  }
}
