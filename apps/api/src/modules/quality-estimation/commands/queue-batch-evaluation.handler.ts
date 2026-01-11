import { MAX_BATCH_TRANSLATION_IDS } from '@lingx/shared';
import { ValidationError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { BatchEvaluationService } from '../../../services/batch-evaluation.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { BatchEvaluationQueuedEvent } from '../events/batch-evaluation-queued.event.js';
import type { QueueBatchEvaluationCommand } from './queue-batch-evaluation.command.js';

/**
 * Handler for QueueBatchEvaluationCommand.
 * Queues batch quality evaluation and emits event.
 */
export class QueueBatchEvaluationHandler implements ICommandHandler<QueueBatchEvaluationCommand> {
  constructor(
    private readonly batchEvaluationService: BatchEvaluationService,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: QueueBatchEvaluationCommand
  ): Promise<InferCommandResult<QueueBatchEvaluationCommand>> {
    // Validate batch size at command layer
    const translationIds = command.options.translationIds;
    if (translationIds && translationIds.length > MAX_BATCH_TRANSLATION_IDS) {
      throw new ValidationError(
        `Batch size exceeds maximum allowed (${MAX_BATCH_TRANSLATION_IDS}). Received: ${translationIds.length}`
      );
    }

    const projectInfo = await this.accessService.verifyBranchAccess(
      command.userId,
      command.branchId
    );

    const result = await this.batchEvaluationService.evaluateBranch(
      command.branchId,
      command.userId,
      projectInfo,
      command.options
    );

    await this.eventBus.publish(
      new BatchEvaluationQueuedEvent(command.branchId, result.jobId, result.stats, command.userId)
    );

    return result;
  }
}
