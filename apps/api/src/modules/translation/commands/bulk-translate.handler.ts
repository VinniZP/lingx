import type { FastifyBaseLogger } from 'fastify';
import { mtBatchQueue } from '../../../lib/queues.js';
import type { AccessService } from '../../../services/access.service.js';
import type { AITranslationService } from '../../../services/ai-translation.service.js';
import type { MTService } from '../../../services/mt.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { KeyTranslationsUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { BulkTranslateCommand, BulkTranslateSyncResult } from './bulk-translate.command.js';

/** Threshold for async processing */
const ASYNC_THRESHOLD_KEYS = 5;
const ASYNC_THRESHOLD_LANGS = 3;

/**
 * Handler for BulkTranslateCommand.
 * Bulk translates empty translations using MT or AI.
 * Large batches are processed in background.
 *
 * Authorization: Requires project membership via branch access.
 */
export class BulkTranslateHandler implements ICommandHandler<BulkTranslateCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus,
    private readonly mtService: MTService,
    private readonly aiService: AITranslationService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: BulkTranslateCommand): Promise<InferCommandResult<BulkTranslateCommand>> {
    const { branchId, keyIds, targetLanguages, provider, userId } = command;

    // Verify user has access to the branch and get project info
    const projectInfo = await this.accessService.verifyBranchAccess(userId, branchId);
    const { projectId, defaultLanguage, languages: projectLanguages } = projectInfo;

    const sourceLanguage = defaultLanguage;

    // Determine target languages
    const targets = targetLanguages?.length
      ? targetLanguages.filter((l) => projectLanguages.includes(l) && l !== sourceLanguage)
      : projectLanguages.filter((l) => l !== sourceLanguage);

    if (targets.length === 0) {
      return { translated: 0, skipped: 0, failed: 0 };
    }

    // Determine if this should be async (large batch)
    const isLargeBatch =
      keyIds.length > ASYNC_THRESHOLD_KEYS || targets.length > ASYNC_THRESHOLD_LANGS;

    if (isLargeBatch) {
      // Queue for background processing
      const job = await mtBatchQueue.add('bulk-translate-ui', {
        type: 'bulk-translate-ui',
        projectId,
        branchId,
        userId,
        keyIds,
        targetLanguages: targets,
        translationProvider: provider,
      });

      return {
        jobId: job.id!,
        async: true as const,
      };
    }

    // Sync processing for small batches
    return this.processSync(projectId, branchId, keyIds, targets, sourceLanguage, provider, userId);
  }

  private async processSync(
    projectId: string,
    branchId: string,
    keyIds: string[],
    targets: string[],
    sourceLanguage: string,
    provider: 'MT' | 'AI',
    userId: string
  ): Promise<BulkTranslateSyncResult> {
    // Fetch keys with their translations
    const keys = await this.translationRepository.getKeysWithTranslations(branchId, keyIds);

    let translated = 0;
    let skipped = 0;
    const errors: Array<{ keyId: string; language: string; error: string }> = [];
    const translatedKeys: Array<{ keyId: string; keyName: string; languages: string[] }> = [];

    // Process each key
    for (const key of keys) {
      const sourceTranslation = key.translations.find((t) => t.language === sourceLanguage);
      const sourceText = sourceTranslation?.value;

      if (!sourceText || sourceText.trim() === '') {
        skipped += targets.length;
        continue;
      }

      const keyTranslatedLanguages: string[] = [];

      // Translate to each target language
      for (const targetLang of targets) {
        const existingTranslation = key.translations.find((t) => t.language === targetLang);
        if (existingTranslation?.value && existingTranslation.value.trim() !== '') {
          skipped++;
          continue;
        }

        try {
          let translatedText: string;

          if (provider === 'MT') {
            const result = await this.mtService.translateWithContext(
              projectId,
              branchId,
              key.id,
              sourceText,
              sourceLanguage,
              targetLang
            );
            translatedText = result.translatedText;
          } else {
            const result = await this.aiService.translate(projectId, {
              text: sourceText,
              sourceLanguage,
              targetLanguage: targetLang,
              keyId: key.id,
              branchId,
            });
            translatedText = result.text;
          }

          // Save the translation
          await this.translationRepository.setTranslation(key.id, targetLang, translatedText);
          translated++;
          keyTranslatedLanguages.push(targetLang);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            { keyId: key.id, language: targetLang, error: errorMessage, provider },
            'Bulk translate failed for key'
          );
          errors.push({
            keyId: key.id,
            language: targetLang,
            error: errorMessage,
          });
        }
      }

      if (keyTranslatedLanguages.length > 0) {
        translatedKeys.push({
          keyId: key.id,
          keyName: key.name,
          languages: keyTranslatedLanguages,
        });
      }
    }

    // Emit events for translated keys
    for (const { keyId, keyName, languages } of translatedKeys) {
      await this.eventBus.publish(
        new KeyTranslationsUpdatedEvent(keyId, keyName, languages, userId, projectId, branchId)
      );
    }

    // Log summary if there were errors
    if (errors.length > 0) {
      this.logger.warn(
        { errorCount: errors.length, translated, skipped, branchId },
        'Bulk translate completed with errors'
      );
    }

    return {
      translated,
      skipped,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
