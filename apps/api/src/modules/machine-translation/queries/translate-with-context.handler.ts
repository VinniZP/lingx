import type { FastifyBaseLogger } from 'fastify';
import { BadRequestError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { AIContextResult, KeyContextService } from '../../key-context/key-context.service.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { TranslateWithContextQuery } from './translate-with-context.query.js';

/**
 * Handler for TranslateWithContextQuery.
 * Translates text with AI context enrichment from related translations and glossary.
 */
export class TranslateWithContextHandler implements IQueryHandler<TranslateWithContextQuery> {
  constructor(
    private readonly mtRepository: MachineTranslationRepository,
    private readonly accessService: AccessService,
    private readonly keyContextService: KeyContextService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    query: TranslateWithContextQuery
  ): Promise<InferQueryResult<TranslateWithContextQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const {
      keyId,
      text,
      sourceLanguage,
      targetLanguage,
      provider: requestedProvider,
    } = query.input;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Text to translate cannot be empty');
    }

    // Get AI context for this key
    let aiContext: AIContextResult | null = null;
    const contextMetadata = { relatedTranslations: 0, glossaryTerms: 0 };
    let contextFetchFailed = false;

    try {
      aiContext = await this.keyContextService.getAIContext(keyId, targetLanguage, sourceLanguage);
    } catch (error) {
      // Context fetch failed - continue without context but track the failure
      contextFetchFailed = true;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        { keyId, targetLanguage, sourceLanguage, error: errorMessage },
        '[MT] Failed to fetch AI context, proceeding without context'
      );
    }

    // Build context-enriched text if we have context
    let enrichedText = text;

    if (aiContext) {
      const contextParts: string[] = [];

      // Add glossary terms as translation hints
      if (aiContext.suggestedTerms.length > 0) {
        const glossaryHint = aiContext.suggestedTerms
          .map((t: { term: string; translation: string }) => `"${t.term}" → "${t.translation}"`)
          .join('; ');
        contextParts.push(`[Glossary: ${glossaryHint}]`);
        contextMetadata.glossaryTerms = aiContext.suggestedTerms.length;
      }

      // Add related translations as reference context
      if (aiContext.relatedTranslations.length > 0) {
        const relatedHint = aiContext.relatedTranslations
          .slice(0, 3) // Limit to 3 examples to avoid token bloat
          .map((rt: { keyName: string; translations: Record<string, string> }) => {
            const sourceText = rt.translations[sourceLanguage] || '';
            const targetText = rt.translations[targetLanguage] || '';
            return `"${sourceText}" → "${targetText}"`;
          })
          .filter((s: string) => s !== '""  → ""') // Skip empty translations
          .join('; ');
        if (relatedHint) {
          contextParts.push(`[Similar translations: ${relatedHint}]`);
        }
        contextMetadata.relatedTranslations = aiContext.relatedTranslations.length;
      }

      // Prepend context to the text for providers that support context hints
      if (contextParts.length > 0) {
        enrichedText = `${contextParts.join(' ')} Translate: ${text}`;
      }
    }

    // Select provider
    const selectedProvider =
      requestedProvider || (await this.mtRepository.selectProvider(query.projectId));
    if (!selectedProvider) {
      throw new BadRequestError('No MT provider configured for this project');
    }

    // For cache key, we still use the original text (not enriched) to maintain consistency
    const cached = await this.mtRepository.getCachedTranslation(
      query.projectId,
      selectedProvider,
      sourceLanguage,
      targetLanguage,
      text
    );

    if (cached) {
      await this.mtRepository.updateUsage(query.projectId, selectedProvider, 0, 0, 1);
      return {
        translatedText: cached.translatedText,
        provider: selectedProvider,
        cached: true,
        characterCount: cached.characterCount,
        context:
          contextMetadata.relatedTranslations > 0 || contextMetadata.glossaryTerms > 0
            ? contextMetadata
            : undefined,
        contextFetchFailed: contextFetchFailed || undefined,
        warning: contextFetchFailed
          ? 'AI context could not be loaded; translation performed without context enrichment'
          : undefined,
      };
    }

    // Get initialized provider
    const mtProvider = await this.mtRepository.getInitializedProvider(
      query.projectId,
      selectedProvider
    );

    // Perform translation with enriched text
    const result = await mtProvider.translate(enrichedText, sourceLanguage, targetLanguage);

    // Clean up the result if we added context prefix
    let translatedText = result.text;
    if (enrichedText !== text) {
      // Some providers might include context in output; try to clean it
      const translatePrefix = 'Translate:';
      if (translatedText.includes(translatePrefix)) {
        translatedText = translatedText.split(translatePrefix).pop()?.trim() || translatedText;
      }
    }

    const characterCount = text.length;

    // Cache with original text key
    await this.mtRepository.cacheTranslation(
      query.projectId,
      selectedProvider,
      sourceLanguage,
      targetLanguage,
      text,
      translatedText,
      characterCount
    );

    await this.mtRepository.updateUsage(query.projectId, selectedProvider, characterCount, 1, 0);

    return {
      translatedText,
      provider: selectedProvider,
      cached: false,
      characterCount,
      context:
        contextMetadata.relatedTranslations > 0 || contextMetadata.glossaryTerms > 0
          ? contextMetadata
          : undefined,
      contextFetchFailed: contextFetchFailed || undefined,
      warning: contextFetchFailed
        ? 'AI context could not be loaded; translation performed without context enrichment'
        : undefined,
    };
  }
}
