import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { ConfigDeletedEvent } from '../events/config-deleted.event.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { DeleteConfigCommand } from './delete-config.command.js';

/**
 * Handler for DeleteConfigCommand.
 * Deletes an MT provider configuration.
 */
export class DeleteConfigHandler implements ICommandHandler<DeleteConfigCommand> {
  constructor(
    private readonly mtRepository: MachineTranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteConfigCommand): Promise<InferCommandResult<DeleteConfigCommand>> {
    // Verify user is MANAGER or OWNER
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    await this.mtRepository.deleteConfig(command.projectId, command.provider);

    await this.eventBus.publish(
      new ConfigDeletedEvent(command.provider, command.userId, command.projectId)
    );

    return { success: true };
  }
}
