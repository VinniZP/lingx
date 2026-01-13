import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { QualityEvaluatedEvent } from '../events/quality-evaluated.event.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import type { EvaluateQualityCommand } from './evaluate-quality.command.js';

/**
 * Handler for EvaluateQualityCommand.
 * Evaluates translation quality and emits event.
 */
export class EvaluateQualityHandler implements ICommandHandler<EvaluateQualityCommand> {
  constructor(
    private readonly qualityEstimationService: QualityEstimationService,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: EvaluateQualityCommand
  ): Promise<InferCommandResult<EvaluateQualityCommand>> {
    await this.accessService.verifyTranslationAccess(command.userId, command.translationId);

    const score = await this.qualityEstimationService.evaluate(
      command.translationId,
      command.options
    );

    await this.eventBus.publish(
      new QualityEvaluatedEvent(command.translationId, score, command.userId)
    );

    return score;
  }
}
