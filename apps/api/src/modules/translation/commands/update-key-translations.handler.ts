import type { FastifyBaseLogger } from 'fastify';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { KeyTranslationsUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { UpdateKeyTranslationsCommand } from './update-key-translations.command.js';

/**
 * Handler for UpdateKeyTranslationsCommand.
 * Updates multiple translations for a key and emits KeyTranslationsUpdatedEvent.
 *
 * Authorization: Requires project membership via key access.
 */
export class UpdateKeyTranslationsHandler implements ICommandHandler<UpdateKeyTranslationsCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: UpdateKeyTranslationsCommand
  ): Promise<InferCommandResult<UpdateKeyTranslationsCommand>> {
    const { keyId, translations, userId } = command;

    // Verify user has access to the key
    await this.accessService.verifyKeyAccess(userId, keyId);

    // Get key info and old translations for comparison
    const key = await this.translationRepository.findKeyById(keyId);
    const projectId = await this.translationRepository.getProjectIdByKeyId(keyId);

    const oldTranslations: Record<string, string | undefined> = {};
    if (key) {
      for (const t of key.translations) {
        oldTranslations[t.language] = t.value;
      }
    }

    // Update translations
    const result = await this.translationRepository.updateKeyTranslations(keyId, translations);

    // Find changed languages
    const changedLanguages = Object.keys(translations).filter(
      (lang) => translations[lang] !== oldTranslations[lang]
    );

    // Emit event for side effects (activity logging, etc.)
    if (projectId && key && changedLanguages.length > 0) {
      await this.eventBus.publish(
        new KeyTranslationsUpdatedEvent(
          keyId,
          key.name,
          changedLanguages,
          userId,
          projectId,
          key.branchId
        )
      );
    } else if (!projectId) {
      this.logger.warn({ keyId }, 'Skipped KeyTranslationsUpdatedEvent: projectId not found');
    } else if (!key) {
      this.logger.warn({ keyId }, 'Skipped KeyTranslationsUpdatedEvent: key not found');
    }
    // Note: changedLanguages.length === 0 is expected and doesn't need logging

    return result;
  }
}
