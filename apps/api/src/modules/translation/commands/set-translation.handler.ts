import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { TranslationUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { SetTranslationCommand } from './set-translation.command.js';

/**
 * Handler for SetTranslationCommand.
 * Sets a translation value and emits TranslationUpdatedEvent.
 *
 * Authorization: Requires project membership via key access.
 */
export class SetTranslationHandler implements ICommandHandler<SetTranslationCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: SetTranslationCommand
  ): Promise<InferCommandResult<SetTranslationCommand>> {
    const { keyId, language, value, userId } = command;

    // Verify user has access to the key
    await this.accessService.verifyKeyAccess(userId, keyId);

    // Get key info for the event
    const key = await this.translationRepository.findKeyById(keyId);
    const projectId = await this.translationRepository.getProjectIdByKeyId(keyId);

    // Get old value for the event
    const oldTranslation = key?.translations.find((t) => t.language === language);
    const oldValue = oldTranslation?.value;

    // Set the translation
    const translation = await this.translationRepository.setTranslation(keyId, language, value);

    // Emit event for side effects (activity logging, etc.)
    if (projectId && key && value !== oldValue) {
      await this.eventBus.publish(
        new TranslationUpdatedEvent(
          translation,
          key.name,
          userId,
          projectId,
          key.branchId,
          oldValue
        )
      );
    } else if (!projectId) {
      this.logger.warn({ keyId }, 'Skipped TranslationUpdatedEvent: projectId not found');
    } else if (!key) {
      this.logger.warn({ keyId }, 'Skipped TranslationUpdatedEvent: key not found');
    }
    // Note: value === oldValue is expected and doesn't need logging

    return translation;
  }
}
