import type { FastifyBaseLogger } from 'fastify';
import { BadRequestError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type {
  TranslateMultiError,
  TranslateMultiQuery,
  TranslateMultiTranslation,
} from './translate-multi.query.js';

/**
 * Handler for TranslateMultiQuery.
 * Translates text to multiple target languages.
 */
export class TranslateMultiHandler implements IQueryHandler<TranslateMultiQuery> {
  constructor(
    private readonly machineTranslationRepository: MachineTranslationRepository,
    private readonly accessService: AccessService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(query: TranslateMultiQuery): Promise<InferQueryResult<TranslateMultiQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const { text, sourceLanguage, targetLanguages, provider: requestedProvider } = query.input;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Text to translate cannot be empty');
    }

    // Select provider
    const selectedProvider =
      requestedProvider ||
      (await this.machineTranslationRepository.selectProvider(query.projectId));
    if (!selectedProvider) {
      throw new BadRequestError('No MT provider configured for this project');
    }

    const translations: Record<string, TranslateMultiTranslation> = {};
    const errors: TranslateMultiError[] = [];
    let totalCharacters = 0;

    // Get initialized provider once
    const mtProvider = await this.machineTranslationRepository.getInitializedProvider(
      query.projectId,
      selectedProvider
    );

    // Process translations sequentially (not in parallel) to avoid
    // rate limiting from MT providers. Each provider has different
    // limits; sequential processing provides natural throttling.
    for (const targetLang of targetLanguages) {
      try {
        // Check cache first
        const cached = await this.machineTranslationRepository.getCachedTranslation(
          query.projectId,
          selectedProvider,
          sourceLanguage,
          targetLang,
          text
        );

        if (cached) {
          await this.machineTranslationRepository.updateUsage(
            query.projectId,
            selectedProvider,
            0,
            0,
            1
          );
          translations[targetLang] = {
            translatedText: cached.translatedText,
            provider: selectedProvider,
            cached: true,
            characterCount: cached.characterCount,
          };
          totalCharacters += cached.characterCount;
          continue;
        }

        // Perform translation
        const result = await mtProvider.translate(text, sourceLanguage, targetLang);
        const characterCount = text.length;

        // Cache the result
        await this.machineTranslationRepository.cacheTranslation(
          query.projectId,
          selectedProvider,
          sourceLanguage,
          targetLang,
          text,
          result.text,
          characterCount
        );

        // Update usage stats
        await this.machineTranslationRepository.updateUsage(
          query.projectId,
          selectedProvider,
          characterCount,
          1,
          0
        );

        translations[targetLang] = {
          translatedText: result.text,
          provider: selectedProvider,
          cached: false,
          characterCount,
        };
        totalCharacters += characterCount;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          { projectId: query.projectId, targetLang, error: errorMessage },
          '[MT] Failed to translate to language'
        );
        errors.push({ language: targetLang, error: errorMessage });
      }
    }

    const hasTranslations = Object.keys(translations).length > 0;
    const hasErrors = errors.length > 0;

    return {
      translations,
      totalCharacters,
      errors: hasErrors ? errors : undefined,
      partialSuccess: hasTranslations && hasErrors ? true : undefined,
    };
  }
}
