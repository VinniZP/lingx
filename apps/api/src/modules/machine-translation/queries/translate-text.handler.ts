import { BadRequestError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { TranslateTextQuery } from './translate-text.query.js';

/**
 * Handler for TranslateTextQuery.
 * Translates a single text using machine translation with caching.
 */
export class TranslateTextHandler implements IQueryHandler<TranslateTextQuery> {
  constructor(
    private readonly mtRepository: MachineTranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: TranslateTextQuery): Promise<InferQueryResult<TranslateTextQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const { text, sourceLanguage, targetLanguage, provider: requestedProvider } = query.input;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Text to translate cannot be empty');
    }

    // Select provider
    const selectedProvider =
      requestedProvider || (await this.mtRepository.selectProvider(query.projectId));
    if (!selectedProvider) {
      throw new BadRequestError('No MT provider configured for this project');
    }

    // Check cache first
    const cached = await this.mtRepository.getCachedTranslation(
      query.projectId,
      selectedProvider,
      sourceLanguage,
      targetLanguage,
      text
    );

    if (cached) {
      // Update usage stats for cache hit
      await this.mtRepository.updateUsage(query.projectId, selectedProvider, 0, 0, 1);

      return {
        translatedText: cached.translatedText,
        provider: selectedProvider,
        cached: true,
        characterCount: cached.characterCount,
      };
    }

    // Get initialized provider and translate
    const mtProvider = await this.mtRepository.getInitializedProvider(
      query.projectId,
      selectedProvider
    );
    const result = await mtProvider.translate(text, sourceLanguage, targetLanguage);

    const characterCount = text.length;

    // Cache the result
    await this.mtRepository.cacheTranslation(
      query.projectId,
      selectedProvider,
      sourceLanguage,
      targetLanguage,
      text,
      result.text,
      characterCount
    );

    // Update usage stats
    await this.mtRepository.updateUsage(query.projectId, selectedProvider, characterCount, 1, 0);

    return {
      translatedText: result.text,
      provider: selectedProvider,
      cached: false,
      characterCount,
    };
  }
}
