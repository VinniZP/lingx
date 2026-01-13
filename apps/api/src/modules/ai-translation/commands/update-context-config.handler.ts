import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { ContextConfigUpdatedEvent } from '../events/context-config-updated.event.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';
import type { UpdateContextConfigCommand } from './update-context-config.command.js';

/**
 * Handler for UpdateContextConfigCommand.
 * Updates AI context configuration for a project.
 */
export class UpdateContextConfigHandler implements ICommandHandler<UpdateContextConfigCommand> {
  constructor(
    private readonly aiRepository: AITranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: UpdateContextConfigCommand
  ): Promise<InferCommandResult<UpdateContextConfigCommand>> {
    // Verify user is MANAGER or OWNER
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const config = await this.aiRepository.updateContextConfig(command.projectId, command.input);

    await this.eventBus.publish(
      new ContextConfigUpdatedEvent(config, command.userId, command.projectId)
    );

    return config;
  }
}
