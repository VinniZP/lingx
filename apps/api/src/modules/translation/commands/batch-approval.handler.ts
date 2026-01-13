import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { TranslationsBatchApprovedEvent } from '../events/translation-approved.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { BatchApprovalCommand } from './batch-approval.command.js';

/**
 * Handler for BatchApprovalCommand.
 * Batch approves/rejects translations and emits TranslationsBatchApprovedEvent.
 *
 * Authorization: Requires MANAGER or OWNER role.
 */
export class BatchApprovalHandler implements ICommandHandler<BatchApprovalCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: BatchApprovalCommand): Promise<InferCommandResult<BatchApprovalCommand>> {
    const { branchId, translationIds, status, userId } = command;

    // Get project ID from branch
    const projectInfo = await this.accessService.verifyBranchAccess(userId, branchId);

    // Verify user has MANAGER or OWNER role (throws ForbiddenError if not)
    await this.accessService.verifyProjectAccess(userId, projectInfo.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    // Verify all translations belong to the same project
    const translationProjectId =
      await this.translationRepository.verifyTranslationsBelongToSameProject(translationIds);

    if (!translationProjectId || translationProjectId !== projectInfo.projectId) {
      throw new ForbiddenError('Some translations do not belong to this project');
    }

    // Batch set approval status
    const updated = await this.translationRepository.batchSetApprovalStatus(
      translationIds,
      status,
      userId
    );

    // Emit event for side effects (activity logging, TM indexing)
    await this.eventBus.publish(
      new TranslationsBatchApprovedEvent(
        translationIds,
        status,
        userId,
        projectInfo.projectId,
        branchId
      )
    );

    return updated;
  }
}
