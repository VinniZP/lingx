import type { FastifyBaseLogger } from 'fastify';
import { TranslateTextQuery } from '../../../modules/machine-translation/index.js';
import type {
  ICommandHandler,
  IEventBus,
  IQueryBus,
  InferCommandResult,
} from '../../../shared/cqrs/index.js';
import { KeyTranslationsUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { BatchTranslateKeysCommand } from './batch-translate-keys.command.js';

/** Batch size for processing translations */
const BATCH_SIZE = 10;

/** Delay between batches (ms) to avoid rate limiting */
const BATCH_DELAY = 500;

/**
 * Handler for BatchTranslateKeysCommand.
 *
 * Batch translates specific keys to a single target language using MT.
 * Processes in batches with delays to respect rate limits.
 *
 * Used by:
 * - MT batch worker for `translate-batch` job type
 */
export class BatchTranslateKeysHandler implements ICommandHandler<BatchTranslateKeysCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly queryBus: IQueryBus,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: BatchTranslateKeysCommand
  ): Promise<InferCommandResult<BatchTranslateKeysCommand>> {
    const {
      projectId,
      keyIds,
      targetLanguage,
      userId,
      provider,
      overwriteExisting,
      progressReporter,
    } = command;

    // Get project default language
    const sourceLanguage = await this.translationRepository.getProjectSourceLanguage(projectId);

    if (!sourceLanguage) {
      throw new Error(`Project ${projectId} not found or has no default language`);
    }

    // Get keys with their translations
    const keys = await this.translationRepository.getKeysByIds(keyIds);

    let translated = 0;
    let skipped = 0;
    let failed = 0;
    const translatedKeys: Array<{ keyId: string; keyName: string; branchId: string }> = [];

    // Process in batches
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);

      for (const key of batch) {
        try {
          // Get source translation
          const sourceTranslation = key.translations.find((t) => t.language === sourceLanguage);

          if (!sourceTranslation?.value) {
            skipped++;
            continue;
          }

          // Check if target translation exists
          const existingTranslation = key.translations.find((t) => t.language === targetLanguage);

          if (existingTranslation?.value && !overwriteExisting) {
            skipped++;
            continue;
          }

          // Translate
          const result = await this.queryBus.execute(
            new TranslateTextQuery(projectId, userId, {
              text: sourceTranslation.value,
              sourceLanguage,
              targetLanguage,
              provider,
            })
          );

          // Save translation
          await this.translationRepository.setTranslation(
            key.id,
            targetLanguage,
            result.translatedText
          );

          translated++;
          translatedKeys.push({ keyId: key.id, keyName: key.name, branchId: key.branchId });
        } catch (error) {
          this.logger.error(
            {
              keyId: key.id,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
            'Failed to translate key'
          );
          failed++;
        }
      }

      // Update progress
      if (progressReporter) {
        await progressReporter.updateProgress({
          processed: i + batch.length,
          total: keys.length,
          translated,
          skipped,
          failed,
        });
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < keys.length) {
        await this.delay(BATCH_DELAY);
      }
    }

    // Emit events for translated keys
    for (const { keyId, keyName, branchId } of translatedKeys) {
      await this.eventBus.publish(
        new KeyTranslationsUpdatedEvent(
          keyId,
          keyName,
          [targetLanguage],
          userId,
          projectId,
          branchId
        )
      );
    }

    this.logger.info({ translated, skipped, failed, projectId }, 'Batch translate keys complete');

    return { translated, skipped, failed };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
