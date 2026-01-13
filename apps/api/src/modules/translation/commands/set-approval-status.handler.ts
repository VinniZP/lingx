import type { FastifyBaseLogger } from 'fastify';
import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { TranslationApprovedEvent } from '../events/translation-approved.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { SetApprovalStatusCommand } from './set-approval-status.command.js';

/**
 * Handler for SetApprovalStatusCommand.
 * Sets approval status and emits TranslationApprovedEvent.
 *
 * Authorization: Requires MANAGER or OWNER role.
 */
export class SetApprovalStatusHandler implements ICommandHandler<SetApprovalStatusCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: SetApprovalStatusCommand
  ): Promise<InferCommandResult<SetApprovalStatusCommand>> {
    const { translationId, status, userId } = command;

    // Get project ID for authorization
    const projectId = await this.translationRepository.getProjectIdByTranslationId(translationId);
    if (!projectId) {
      throw new NotFoundError('Translation');
    }

    // Verify user has MANAGER or OWNER role (throws ForbiddenError if not)
    await this.accessService.verifyProjectAccess(userId, projectId, ['MANAGER', 'OWNER']);

    // Get translation info for the event
    const translation = await this.translationRepository.findTranslationById(translationId);
    if (!translation) {
      throw new NotFoundError('Translation');
    }

    const key = await this.translationRepository.findKeyById(translation.keyId);

    // Set approval status
    const result = await this.translationRepository.setApprovalStatus(
      translationId,
      status,
      userId
    );

    // Emit event for side effects (activity logging, TM indexing)
    if (key) {
      await this.eventBus.publish(
        new TranslationApprovedEvent(result, key.name, status, userId, projectId, key.branchId)
      );
    } else {
      this.logger.warn(
        { translationId },
        'Skipped TranslationApprovedEvent: key not found for translation'
      );
    }

    return result;
  }
}
