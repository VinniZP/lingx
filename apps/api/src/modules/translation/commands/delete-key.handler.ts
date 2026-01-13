import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { KeyDeletedEvent } from '../events/key-deleted.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { DeleteKeyCommand } from './delete-key.command.js';

/**
 * Handler for DeleteKeyCommand.
 * Deletes a translation key and emits KeyDeletedEvent.
 *
 * Authorization: Requires project membership via key access.
 */
export class DeleteKeyHandler implements ICommandHandler<DeleteKeyCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: DeleteKeyCommand): Promise<InferCommandResult<DeleteKeyCommand>> {
    const { keyId, userId } = command;

    // Verify user has access to the key
    await this.accessService.verifyKeyAccess(userId, keyId);

    // Get project info for the event
    const projectId = await this.translationRepository.getProjectIdByKeyId(keyId);

    // Delete the key (returns the deleted key for event)
    const key = await this.translationRepository.deleteKey(keyId);

    // Emit event for side effects (activity logging, etc.)
    if (projectId) {
      await this.eventBus.publish(new KeyDeletedEvent(key, userId, projectId, key.branchId));
    } else {
      this.logger.warn({ keyId }, 'Skipped KeyDeletedEvent: projectId not found');
    }
  }
}
