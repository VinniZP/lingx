import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { TranslationsImportedEvent } from '../events/translations-imported.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { BulkUpdateTranslationsCommand } from './bulk-update-translations.command.js';

/**
 * Handler for BulkUpdateTranslationsCommand.
 * Bulk updates translations (CLI push) and emits TranslationsImportedEvent.
 *
 * Authorization: Requires project membership via branch access.
 */
export class BulkUpdateTranslationsHandler implements ICommandHandler<BulkUpdateTranslationsCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: BulkUpdateTranslationsCommand
  ): Promise<InferCommandResult<BulkUpdateTranslationsCommand>> {
    const { branchId, translations, userId } = command;

    // Verify user has access to the branch
    const projectInfo = await this.accessService.verifyBranchAccess(userId, branchId);

    // Count keys and collect languages
    const keyCount = Object.keys(translations).length;
    const languages = new Set<string>();
    for (const keyTranslations of Object.values(translations)) {
      for (const lang of Object.keys(keyTranslations)) {
        languages.add(lang);
      }
    }

    // Bulk update translations
    const result = await this.translationRepository.bulkUpdateTranslations(branchId, translations);

    // Emit event for side effects (activity logging, etc.)
    if (keyCount > 0) {
      await this.eventBus.publish(
        new TranslationsImportedEvent(
          result,
          keyCount,
          Array.from(languages),
          userId,
          projectInfo.projectId,
          branchId
        )
      );
    }

    return result;
  }
}
