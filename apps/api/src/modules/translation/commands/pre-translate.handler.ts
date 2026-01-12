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
import type { PreTranslateCommand } from './pre-translate.command.js';

/** Batch size for processing translations */
const BATCH_SIZE = 10;

/** Delay between batches (ms) to avoid rate limiting */
const BATCH_DELAY = 500;

/**
 * Handler for PreTranslateCommand.
 *
 * Pre-translates missing translations for all keys in a branch.
 * Only fills in empty translations, never overwrites existing ones.
 *
 * Used by:
 * - MT batch worker for `pre-translate` job type
 */
export class PreTranslateHandler implements ICommandHandler<PreTranslateCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly queryBus: IQueryBus,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: PreTranslateCommand): Promise<InferCommandResult<PreTranslateCommand>> {
    const { projectId, branchId, targetLanguages, userId, provider, progressReporter } = command;

    if (targetLanguages.length === 0) {
      this.logger.warn({ branchId }, 'Pre-translate called with no target languages');
      return { translated: 0, skipped: 0, failed: 0 };
    }

    // Get project default language
    const sourceLanguage = await this.translationRepository.getProjectSourceLanguage(projectId);

    if (!sourceLanguage) {
      throw new Error(`Project ${projectId} not found or has no default language`);
    }

    // Get all keys for the branch with translations
    const keys = await this.translationRepository.getKeysByBranchId(branchId);

    let translated = 0;
    let skipped = 0;
    let failed = 0;
    const totalOperations = keys.length * targetLanguages.length;
    let processed = 0;

    const translatedKeysByLang = new Map<string, Array<{ keyId: string; keyName: string }>>();

    // Process each target language
    for (const targetLang of targetLanguages) {
      // Process keys in batches
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);

        for (const key of batch) {
          try {
            processed++;

            // Get source translation
            const sourceTranslation = key.translations.find((t) => t.language === sourceLanguage);

            if (!sourceTranslation?.value) {
              skipped++;
              continue;
            }

            // Check if target translation exists
            const existingTranslation = key.translations.find((t) => t.language === targetLang);

            if (existingTranslation?.value) {
              skipped++;
              continue;
            }

            // Translate
            const result = await this.queryBus.execute(
              new TranslateTextQuery(projectId, userId, {
                text: sourceTranslation.value,
                sourceLanguage,
                targetLanguage: targetLang,
                provider,
              })
            );

            // Save translation
            await this.translationRepository.setTranslation(
              key.id,
              targetLang,
              result.translatedText
            );

            translated++;

            // Track translated keys by language
            if (!translatedKeysByLang.has(targetLang)) {
              translatedKeysByLang.set(targetLang, []);
            }
            translatedKeysByLang.get(targetLang)!.push({ keyId: key.id, keyName: key.name });
          } catch (error) {
            this.logger.error(
              {
                keyId: key.id,
                targetLang,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
              'Failed to pre-translate key'
            );
            failed++;
          }
        }

        // Update progress
        if (progressReporter) {
          await progressReporter.updateProgress({
            processed,
            total: totalOperations,
            translated,
            skipped,
            failed,
          });
        }

        // Delay between batches
        if (i + BATCH_SIZE < keys.length) {
          await this.delay(BATCH_DELAY);
        }
      }
    }

    // Emit events for translated keys (one event per key, listing all translated languages)
    const keyLanguages = new Map<string, { keyName: string; languages: string[] }>();
    for (const [lang, keys] of translatedKeysByLang) {
      for (const { keyId, keyName } of keys) {
        if (!keyLanguages.has(keyId)) {
          keyLanguages.set(keyId, { keyName, languages: [] });
        }
        keyLanguages.get(keyId)!.languages.push(lang);
      }
    }

    for (const [keyId, { keyName, languages }] of keyLanguages) {
      await this.eventBus.publish(
        new KeyTranslationsUpdatedEvent(keyId, keyName, languages, userId, projectId, branchId)
      );
    }

    this.logger.info({ translated, skipped, failed, branchId }, 'Pre-translate complete');

    return { translated, skipped, failed };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
