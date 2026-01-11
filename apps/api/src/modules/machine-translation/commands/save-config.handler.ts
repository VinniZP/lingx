import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ConfigSavedEvent } from '../events/config-saved.event.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { SaveConfigCommand } from './save-config.command.js';

/**
 * Handler for SaveConfigCommand.
 * Creates or updates an MT provider configuration.
 */
export class SaveConfigHandler implements ICommandHandler<SaveConfigCommand> {
  constructor(
    private readonly mtRepository: MachineTranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: SaveConfigCommand): Promise<InferCommandResult<SaveConfigCommand>> {
    // Verify user is MANAGER or OWNER
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const config = await this.mtRepository.saveConfig(command.projectId, command.input);

    await this.eventBus.publish(new ConfigSavedEvent(config, command.userId, command.projectId));

    return config;
  }
}
