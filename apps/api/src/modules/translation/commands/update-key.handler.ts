import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { KeyUpdatedEvent } from '../events/key-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { UpdateKeyCommand } from './update-key.command.js';

/**
 * Handler for UpdateKeyCommand.
 * Updates a translation key and emits KeyUpdatedEvent.
 *
 * Authorization: Requires project membership via key access.
 */
export class UpdateKeyHandler implements ICommandHandler<UpdateKeyCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: UpdateKeyCommand): Promise<InferCommandResult<UpdateKeyCommand>> {
    const { keyId, name, namespace, description, userId } = command;

    // Verify user has access to the key
    await this.accessService.verifyKeyAccess(userId, keyId);

    // Get project info for the event
    const projectId = await this.translationRepository.getProjectIdByKeyId(keyId);

    // Update the key
    const key = await this.translationRepository.updateKey(keyId, {
      name,
      namespace,
      description,
    });

    // Emit event for side effects (activity logging, etc.)
    if (projectId) {
      await this.eventBus.publish(new KeyUpdatedEvent(key, userId, projectId, key.branchId));
    } else {
      this.logger.warn({ keyId }, 'Skipped KeyUpdatedEvent: projectId not found');
    }

    return key;
  }
}
