import { generateText } from 'ai';
import type { FastifyBaseLogger } from 'fastify';
import { BadRequestError, NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';
import type { AIProviderService } from '../services/ai-provider.service.js';
import type { TranslateQuery } from './translate.query.js';

/**
 * Maximum text length for AI translation (characters).
 * Prevents abuse and excessive token usage.
 * 10,000 characters ≈ 2,500 tokens for most languages.
 */
const MAX_TEXT_LENGTH = 10_000;

interface AITranslationContext {
  sourceLanguage: string;
  targetLanguage: string;
  glossaryTerms: Array<{ source: string; target: string; context?: string }>;
  tmMatches: Array<{ source: string; target: string; similarity: number }>;
  relatedTranslations: Array<{ key: string; source: string; target: string }>;
  projectDescription?: string;
  customInstructions?: string;
}

/**
 * Handler for TranslateQuery.
 * Translates text using AI with context from glossary, TM, and related translations.
 */
export class TranslateHandler implements IQueryHandler<TranslateQuery> {
  constructor(
    private readonly aiRepository: AITranslationRepository,
    private readonly accessService: AccessService,
    private readonly aiProviderService: AIProviderService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(query: TranslateQuery): Promise<InferQueryResult<TranslateQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const { text, sourceLanguage, targetLanguage, keyId, branchId, provider } = query.input;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Text to translate cannot be empty');
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new BadRequestError(
        `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters (received ${text.length})`
      );
    }

    // Select provider
    const selectedProvider = provider || (await this.aiRepository.selectProvider(query.projectId));
    if (!selectedProvider) {
      throw new BadRequestError('No AI provider configured for this project');
    }

    // Get provider config
    const config = await this.aiRepository.getConfig(query.projectId, selectedProvider);

    if (!config) {
      throw new NotFoundError(`AI configuration for ${selectedProvider} not found`);
    }

    if (!config.isActive) {
      throw new BadRequestError(`AI provider ${selectedProvider} is not active`);
    }

    // Check cache first
    const cached = await this.aiRepository.getCachedTranslation(
      query.projectId,
      selectedProvider,
      config.model,
      sourceLanguage,
      targetLanguage,
      text
    );

    if (cached) {
      // Update usage stats for cache hit
      await this.aiRepository.updateUsage(
        query.projectId,
        selectedProvider,
        config.model,
        0,
        0,
        0,
        1
      );

      return {
        text: cached.translatedText,
        provider: selectedProvider,
        model: config.model,
        inputTokens: 0,
        outputTokens: 0,
        cached: true,
      };
    }

    // Build context
    const context = await this.buildContext(
      query.projectId,
      text,
      sourceLanguage,
      targetLanguage,
      keyId,
      branchId
    );

    // Get language model
    const model = this.aiProviderService.getLanguageModel(
      selectedProvider,
      config.model,
      config.apiKey
    );

    // Build prompts
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(text, context);

    // Perform translation
    let rawTranslation: string;
    let usage: { inputTokens?: number; outputTokens?: number } | undefined;

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
      });
      rawTranslation = result.text;
      usage = result.usage;
    } catch (error) {
      this.logger.error(
        {
          projectId: query.projectId,
          provider: selectedProvider,
          model: config.model,
          sourceLanguage,
          targetLanguage,
          textLength: text.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '[AI Translation] Translation API call failed'
      );
      throw error;
    }

    // Clean up the response
    const translatedText = this.cleanTranslationOutput(rawTranslation);

    const inputTokens = usage?.inputTokens || 0;
    const outputTokens = usage?.outputTokens || 0;

    // Cache the result
    await this.aiRepository.cacheTranslation(
      query.projectId,
      selectedProvider,
      config.model,
      sourceLanguage,
      targetLanguage,
      text,
      translatedText,
      inputTokens + outputTokens
    );

    // Update usage stats
    await this.aiRepository.updateUsage(
      query.projectId,
      selectedProvider,
      config.model,
      inputTokens,
      outputTokens,
      1,
      0
    );

    return {
      text: translatedText,
      provider: selectedProvider,
      model: config.model,
      inputTokens,
      outputTokens,
      cached: false,
      context: {
        glossaryTerms: context.glossaryTerms.length,
        tmMatches: context.tmMatches.length,
        relatedKeys: context.relatedTranslations.length,
      },
    };
  }

  /**
   * Build translation context from various sources
   */
  private async buildContext(
    projectId: string,
    _text: string,
    sourceLanguage: string,
    targetLanguage: string,
    _keyId?: string,
    _branchId?: string
  ): Promise<AITranslationContext> {
    // Get context config
    const contextConfig = await this.aiRepository.getContextConfig(projectId);

    const context: AITranslationContext = {
      sourceLanguage,
      targetLanguage,
      glossaryTerms: [],
      tmMatches: [],
      relatedTranslations: [],
    };

    // Get project description
    if (contextConfig.includeDescription) {
      try {
        const project = await this.aiRepository.getProject(projectId);
        if (project?.description) {
          context.projectDescription = project.description;
        }
      } catch (error) {
        this.logger.warn(
          {
            projectId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          '[AI Translation] Failed to fetch project description for context - proceeding without it'
        );
      }
    }

    // Add custom instructions
    if (contextConfig.customInstructions) {
      context.customInstructions = contextConfig.customInstructions;
    }

    // TODO: Implement context enrichment features
    //
    // The following context features are configured but not yet implemented:
    // - Glossary terms (contextConfig.includeGlossary, contextConfig.glossaryLimit)
    //   Requires: GlossaryRepository to fetch matching terms for source text
    // - Translation memory matches (contextConfig.includeTM, contextConfig.tmLimit, contextConfig.tmMinSimilarity)
    //   Requires: TranslationMemoryService to find similar translations
    // - Related keys (contextConfig.includeRelatedKeys, contextConfig.relatedKeysLimit)
    //   Requires: KeyContextService to find semantically related translation keys
    //
    // These features improve translation quality by providing context to the AI model.
    // Implementation was deferred to keep the initial CQRS migration focused.
    // See: https://github.com/VinniZP/lingx/issues/53

    return context;
  }

  /**
   * Build system prompt for translation
   */
  private buildSystemPrompt(context: AITranslationContext): string {
    const parts: string[] = [
      'You are a professional translator for software UI localization.',
      `Translate text from ${context.sourceLanguage} to ${context.targetLanguage}.`,
      '',
      '<output_format>',
      'Return ONLY the translated text inside <translation> tags.',
      'Example: <translation>Translated text here</translation>',
      '</output_format>',
      '',
      '<rules>',
      '- Return ONLY the <translation> tag with the translated text inside',
      '- Do NOT include any text outside the <translation> tags',
      '- Do NOT add quotes, explanations, or notes',
      '- Preserve all placeholders exactly: {name}, {count}, {{var}}, %s, %d',
      '- Preserve ICU format: {count, plural, one {# item} other {# items}}',
      '- Preserve HTML/JSX tags: <b>, <strong>, <Link>, etc.',
      '- Use glossary terms exactly as provided',
      '- Match tone and formality of reference translations',
      '</rules>',
    ];

    if (context.projectDescription) {
      parts.push('', `<project_context>${context.projectDescription}</project_context>`);
    }

    if (context.customInstructions) {
      parts.push('', `<custom_instructions>${context.customInstructions}</custom_instructions>`);
    }

    return parts.join('\n');
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(text: string, context: AITranslationContext): string {
    const parts: string[] = [];

    if (context.glossaryTerms.length > 0) {
      parts.push('<glossary>');
      context.glossaryTerms.forEach((t) => {
        parts.push(
          `  <term source="${this.escapeXml(t.source)}" target="${this.escapeXml(t.target)}"${t.context ? ` context="${this.escapeXml(t.context)}"` : ''}/>`
        );
      });
      parts.push('</glossary>');
      parts.push('');
    }

    if (context.tmMatches.length > 0) {
      parts.push('<reference_translations>');
      context.tmMatches.forEach((m) => {
        parts.push(
          `  <example source="${this.escapeXml(m.source)}" target="${this.escapeXml(m.target)}"/>`
        );
      });
      parts.push('</reference_translations>');
      parts.push('');
    }

    if (context.relatedTranslations.length > 0) {
      parts.push('<related_keys>');
      context.relatedTranslations.forEach((r) => {
        parts.push(
          `  <key name="${this.escapeXml(r.key)}" source="${this.escapeXml(r.source)}" target="${this.escapeXml(r.target)}"/>`
        );
      });
      parts.push('</related_keys>');
      parts.push('');
    }

    // Add the source text to translate
    parts.push(`<source>${this.escapeXml(text)}</source>`);

    return parts.join('\n');
  }

  /**
   * Escape special XML characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Clean up AI translation output
   */
  private cleanTranslationOutput(text: string): string {
    let cleaned = text.trim();

    // Try to extract from <translation> tags first (expected format)
    const xmlMatch = cleaned.match(/<translation>([\s\S]*?)<\/translation>/i);
    if (xmlMatch) {
      cleaned = this.unescapeXml(xmlMatch[1].trim());
      return cleaned;
    }

    // Fallback: remove common prefixes
    const prefixes = [
      /^(Translation|Translated|Result|Output|Here is the translation|The translation is|Перевод|Переклад|Übersetzung|Traduction):\s*/i,
      /^["'`«„"']+/,
    ];

    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '');
    }

    // Remove trailing quotes if matching
    const quotePairs: [string, string][] = [
      ['"', '"'],
      ["'", "'"],
      ['`', '`'],
      ['«', '»'],
      ['„', '"'],
      ['\u201C', '\u201D'],
      ['\u2018', '\u2019'],
    ];

    for (const [open, close] of quotePairs) {
      if (cleaned.startsWith(open) && cleaned.endsWith(close) && cleaned.length > 2) {
        cleaned = cleaned.slice(open.length, -close.length);
        break;
      }
    }

    return cleaned.trim();
  }

  /**
   * Unescape XML entities
   */
  private unescapeXml(text: string): string {
    return text
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }
}
