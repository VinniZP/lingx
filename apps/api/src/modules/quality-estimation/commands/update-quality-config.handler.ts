import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { QualityConfigUpdatedEvent } from '../events/quality-config-updated.event.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import type { UpdateQualityConfigCommand } from './update-quality-config.command.js';

/**
 * Handler for UpdateQualityConfigCommand.
 * Updates quality scoring configuration and emits event.
 */
export class UpdateQualityConfigHandler implements ICommandHandler<UpdateQualityConfigCommand> {
  constructor(
    private readonly qualityEstimationService: QualityEstimationService,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: UpdateQualityConfigCommand
  ): Promise<InferCommandResult<UpdateQualityConfigCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'OWNER',
      'MANAGER',
    ]);

    await this.qualityEstimationService.updateConfig(command.projectId, command.input);
    const config = await this.qualityEstimationService.getConfig(command.projectId);

    await this.eventBus.publish(
      new QualityConfigUpdatedEvent(command.projectId, config, command.userId)
    );

    return config;
  }
}
