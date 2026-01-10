import type { FastifyBaseLogger } from 'fastify';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { TranslationUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { SetTranslationWithQualityCommand } from './set-translation-with-quality.command.js';

/**
 * Handler for SetTranslationWithQualityCommand.
 * Sets a translation with quality check feedback and emits TranslationUpdatedEvent.
 *
 * Authorization: Requires project membership via key access.
 */
export class SetTranslationWithQualityHandler implements ICommandHandler<SetTranslationWithQualityCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: SetTranslationWithQualityCommand
  ): Promise<InferCommandResult<SetTranslationWithQualityCommand>> {
    const { keyId, language, value, userId } = command;

    // Verify user has access to the key and get project info
    await this.accessService.verifyKeyAccess(userId, keyId);

    // Get key info for event and source language
    const key = await this.translationRepository.findKeyById(keyId);
    const projectId = await this.translationRepository.getProjectIdByKeyId(keyId);

    // Get project's default language for quality check
    const branchInfo = key ? await this.translationRepository.getBranchInfo(key.branchId) : null;
    const sourceLanguage = branchInfo?.sourceLanguage || 'en';
    if (!branchInfo?.sourceLanguage) {
      this.logger.warn({ keyId }, 'Using fallback source language "en" for quality check');
    }

    // Get old value for the event
    const oldTranslation = key?.translations.find((t) => t.language === language);
    const oldValue = oldTranslation?.value;

    // Set translation with quality check
    const { translation, qualityIssues } =
      await this.translationRepository.setTranslationWithQuality(
        keyId,
        language,
        value,
        sourceLanguage
      );

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

    return { translation, qualityIssues };
  }
}
