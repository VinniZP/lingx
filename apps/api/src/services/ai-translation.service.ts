/**
 * AI Translation Service
 *
 * Provider-agnostic AI translation using Vercel AI SDK.
 * Supports OpenAI, Anthropic with configurable context per project.
 */
import {
  PrismaClient,
  AIProvider as AIProviderEnum,
  AIContextConfig,
} from '@prisma/client';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, type LanguageModel } from 'ai';
import { KeyContextService, type AIContextResult } from './key-context.service.js';
import { GlossaryService, type GlossaryMatch } from './glossary.service.js';
import { TranslationMemoryService, type TMMatch } from './translation-memory.service.js';
import { BadRequestError, NotFoundError } from '../plugins/error-handler.js';

/** Cache TTL in days */
const CACHE_TTL_DAYS = 30;

/** Default context configuration */
const DEFAULT_CONTEXT_CONFIG: Omit<AIContextConfig, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> = {
  includeGlossary: true,
  glossaryLimit: 10,
  includeTM: true,
  tmLimit: 5,
  tmMinSimilarity: 0.7,
  includeRelatedKeys: true,
  relatedKeysLimit: 5,
  includeDescription: true,
  customInstructions: null,
};

/** Supported AI providers and their models (December 2025) */
const PROVIDER_MODELS: Record<AIProviderEnum, string[]> = {
  // OpenAI: GPT-5.2 (Dec 2025), GPT-5.1 (Nov 2025), GPT-4.1 (Apr 2025)
  OPENAI: ['gpt-5.2', 'gpt-5.1', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
  // Anthropic: Claude 4.5 series - using alias format (auto-updates to latest)
  ANTHROPIC: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-5'],
  // Google: Gemini 3 (Nov 2025), Gemini 2.0 (2024)
  GOOGLE_AI: ['gemini-3-flash', 'gemini-3-pro', 'gemini-2.0-flash'],
  MISTRAL: ['mistral-large-latest', 'mistral-small-latest'],
};

/** Pricing per 1M tokens (input, output) in USD - December 2025 */
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI GPT-5.x series (2025)
  'gpt-5.2': { input: 1.75, output: 14.00 },
  'gpt-5.1': { input: 2.00, output: 12.00 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.10, output: 0.40 },
  'o4-mini': { input: 1.10, output: 4.40 },
  // Anthropic Claude 4.5 series (2025)
  'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5': { input: 1.00, output: 5.00 },
  'claude-opus-4-5': { input: 15.00, output: 75.00 },
  // Google AI Gemini 3 (Nov 2025)
  'gemini-3-flash': { input: 0.15, output: 0.60 },
  'gemini-3-pro': { input: 1.25, output: 5.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  // Mistral
  'mistral-large-latest': { input: 2.00, output: 6.00 },
  'mistral-small-latest': { input: 0.20, output: 0.60 },
};

export type AIProviderType = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE_AI' | 'MISTRAL';

export interface AIConfigInput {
  provider: AIProviderType;
  apiKey?: string; // Optional for updates (to change model/isActive without re-entering key)
  model: string;
  isActive?: boolean;
  priority?: number;
}

export interface AIConfigResponse {
  id: string;
  provider: AIProviderType;
  model: string;
  keyPrefix: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AITranslateInput {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  keyId?: string;
  branchId?: string;
  provider?: AIProviderType;
}

export interface AITranslateResult {
  text: string;
  provider: AIProviderType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
  context?: {
    glossaryTerms: number;
    tmMatches: number;
    relatedKeys: number;
  };
}

export interface AIUsageStats {
  provider: AIProviderType;
  model: string;
  currentMonth: {
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
    cacheHits: number;
    estimatedCost: number;
  };
  allTime: {
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
  };
}

export interface AIContextConfigInput {
  includeGlossary?: boolean;
  glossaryLimit?: number;
  includeTM?: boolean;
  tmLimit?: number;
  tmMinSimilarity?: number;
  includeRelatedKeys?: boolean;
  relatedKeysLimit?: number;
  includeDescription?: boolean;
  customInstructions?: string | null;
}

interface AITranslationContext {
  sourceLanguage: string;
  targetLanguage: string;
  glossaryTerms: Array<{ source: string; target: string; context?: string }>;
  tmMatches: Array<{ source: string; target: string; similarity: number }>;
  relatedTranslations: Array<{ key: string; source: string; target: string }>;
  projectDescription?: string;
  customInstructions?: string;
}

export class AITranslationService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // CONFIGURATION MANAGEMENT
  // ============================================

  /**
   * Save or update AI provider configuration
   * If apiKey is not provided for an existing config, the existing key is kept.
   * For new configs, apiKey is required.
   */
  async saveConfig(projectId: string, input: AIConfigInput): Promise<AIConfigResponse> {
    // Validate model for provider
    const validModels = PROVIDER_MODELS[input.provider as AIProviderEnum];
    if (!validModels?.includes(input.model)) {
      throw new BadRequestError(
        `Invalid model "${input.model}" for provider ${input.provider}. Valid models: ${validModels?.join(', ')}`
      );
    }

    // Check if config already exists
    const existingConfig = await this.prisma.aITranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: input.provider as AIProviderEnum,
        },
      },
    });

    // If no existing config and no apiKey provided, throw error
    if (!existingConfig && !input.apiKey) {
      throw new BadRequestError('API key is required for new provider configuration');
    }

    // Prepare the update/create data
    let apiKeyData: { apiKey: string; apiKeyIv: string } | undefined;
    if (input.apiKey) {
      const { encrypted, iv } = this.encryptApiKey(input.apiKey);
      apiKeyData = { apiKey: encrypted, apiKeyIv: iv };
    }

    let config;
    if (existingConfig) {
      // Update existing config
      config = await this.prisma.aITranslationConfig.update({
        where: {
          projectId_provider: {
            projectId,
            provider: input.provider as AIProviderEnum,
          },
        },
        data: {
          ...(apiKeyData && { apiKey: apiKeyData.apiKey, apiKeyIv: apiKeyData.apiKeyIv }),
          model: input.model,
          isActive: input.isActive ?? true,
          priority: input.priority ?? 0,
        },
      });
    } else {
      // Create new config (apiKey is guaranteed to exist here)
      const { encrypted, iv } = this.encryptApiKey(input.apiKey!);
      config = await this.prisma.aITranslationConfig.create({
        data: {
          projectId,
          provider: input.provider as AIProviderEnum,
          apiKey: encrypted,
          apiKeyIv: iv,
          model: input.model,
          isActive: input.isActive ?? true,
          priority: input.priority ?? 0,
        },
      });
    }

    // For response, use new apiKey if provided, otherwise decrypt existing
    const keyForResponse = input.apiKey || this.decryptApiKey(config.apiKey, config.apiKeyIv);
    return this.formatConfigResponse(config, keyForResponse);
  }

  /**
   * Get all AI configurations for a project (with masked keys)
   */
  async getConfigs(projectId: string): Promise<AIConfigResponse[]> {
    const configs = await this.prisma.aITranslationConfig.findMany({
      where: { projectId },
      orderBy: { priority: 'asc' },
    });

    return configs.map((config) => ({
      id: config.id,
      provider: config.provider as AIProviderType,
      model: config.model,
      keyPrefix: this.getKeyPrefix(this.decryptApiKey(config.apiKey, config.apiKeyIv)),
      isActive: config.isActive,
      priority: config.priority,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));
  }

  /**
   * Delete AI provider configuration
   */
  async deleteConfig(projectId: string, provider: AIProviderType): Promise<void> {
    const config = await this.prisma.aITranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: provider as AIProviderEnum,
        },
      },
    });

    if (!config) {
      throw new NotFoundError(`AI configuration for ${provider} not found`);
    }

    await this.prisma.aITranslationConfig.delete({
      where: { id: config.id },
    });
  }

  /**
   * Get context configuration for a project
   */
  async getContextConfig(projectId: string): Promise<AIContextConfigInput> {
    const config = await this.prisma.aIContextConfig.findUnique({
      where: { projectId },
    });

    if (!config) {
      return DEFAULT_CONTEXT_CONFIG;
    }

    return {
      includeGlossary: config.includeGlossary,
      glossaryLimit: config.glossaryLimit,
      includeTM: config.includeTM,
      tmLimit: config.tmLimit,
      tmMinSimilarity: config.tmMinSimilarity,
      includeRelatedKeys: config.includeRelatedKeys,
      relatedKeysLimit: config.relatedKeysLimit,
      includeDescription: config.includeDescription,
      customInstructions: config.customInstructions,
    };
  }

  /**
   * Update context configuration for a project
   */
  async updateContextConfig(
    projectId: string,
    input: AIContextConfigInput
  ): Promise<AIContextConfigInput> {
    const config = await this.prisma.aIContextConfig.upsert({
      where: { projectId },
      update: input,
      create: {
        projectId,
        ...DEFAULT_CONTEXT_CONFIG,
        ...input,
      },
    });

    return {
      includeGlossary: config.includeGlossary,
      glossaryLimit: config.glossaryLimit,
      includeTM: config.includeTM,
      tmLimit: config.tmLimit,
      tmMinSimilarity: config.tmMinSimilarity,
      includeRelatedKeys: config.includeRelatedKeys,
      relatedKeysLimit: config.relatedKeysLimit,
      includeDescription: config.includeDescription,
      customInstructions: config.customInstructions,
    };
  }

  /**
   * Test AI provider connection
   */
  async testConnection(
    projectId: string,
    provider: AIProviderType
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.prisma.aITranslationConfig.findUnique({
        where: {
          projectId_provider: {
            projectId,
            provider: provider as AIProviderEnum,
          },
        },
      });

      if (!config) {
        return { success: false, error: `No configuration found for ${provider}` };
      }

      const apiKey = this.decryptApiKey(config.apiKey, config.apiKeyIv);
      const model = this.getLanguageModel(provider, config.model, apiKey);

      // Try a simple completion
      await generateText({
        model,
        prompt: 'Say "ok"',
        maxOutputTokens: 5,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get supported models for a provider
   */
  getSupportedModels(provider: AIProviderType): string[] {
    return PROVIDER_MODELS[provider as AIProviderEnum] || [];
  }

  // ============================================
  // TRANSLATION
  // ============================================

  /**
   * Translate text using AI with context
   */
  async translate(
    projectId: string,
    input: AITranslateInput
  ): Promise<AITranslateResult> {
    const { text, sourceLanguage, targetLanguage, keyId, branchId, provider } = input;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Text to translate cannot be empty');
    }

    // Select provider
    const selectedProvider = provider || (await this.selectProvider(projectId));
    if (!selectedProvider) {
      throw new BadRequestError('No AI provider configured for this project');
    }

    // Get provider config
    const config = await this.prisma.aITranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: selectedProvider as AIProviderEnum,
        },
      },
    });

    if (!config) {
      throw new NotFoundError(`AI configuration for ${selectedProvider} not found`);
    }

    if (!config.isActive) {
      throw new BadRequestError(`AI provider ${selectedProvider} is not active`);
    }

    // Check cache first
    const cached = await this.getCachedTranslation(
      projectId,
      selectedProvider,
      config.model,
      sourceLanguage,
      targetLanguage,
      text
    );

    if (cached) {
      // Update usage stats for cache hit
      await this.updateUsage(projectId, selectedProvider, config.model, 0, 0, 0, 1);

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
      projectId,
      text,
      sourceLanguage,
      targetLanguage,
      keyId,
      branchId
    );

    // Get language model
    const apiKey = this.decryptApiKey(config.apiKey, config.apiKeyIv);
    const model = this.getLanguageModel(selectedProvider, config.model, apiKey);

    // Build prompts
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(text, context);

    // Perform translation
    const { text: rawTranslation, usage } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Clean up the response (remove quotes, prefixes, etc.)
    const translatedText = this.cleanTranslationOutput(rawTranslation);

    const inputTokens = usage?.inputTokens || 0;
    const outputTokens = usage?.outputTokens || 0;

    // Cache the result
    await this.cacheTranslation(
      projectId,
      selectedProvider,
      config.model,
      sourceLanguage,
      targetLanguage,
      text,
      translatedText,
      inputTokens + outputTokens
    );

    // Update usage stats
    await this.updateUsage(
      projectId,
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

  // ============================================
  // USAGE STATISTICS
  // ============================================

  /**
   * Get usage statistics for a project
   */
  async getUsage(projectId: string): Promise<AIUsageStats[]> {
    const configs = await this.prisma.aITranslationConfig.findMany({
      where: { projectId },
    });

    const currentYearMonth = this.getCurrentYearMonth();

    const stats: AIUsageStats[] = [];

    for (const config of configs) {
      // Get current month usage
      const currentMonthUsage = await this.prisma.aITranslationUsage.findUnique({
        where: {
          projectId_provider_model_yearMonth: {
            projectId,
            provider: config.provider,
            model: config.model,
            yearMonth: currentYearMonth,
          },
        },
      });

      // Get all-time usage
      const allTimeUsage = await this.prisma.aITranslationUsage.aggregate({
        where: {
          projectId,
          provider: config.provider,
          model: config.model,
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          requestCount: true,
        },
      });

      // Calculate cost
      const inputTokens = Number(currentMonthUsage?.inputTokens || 0n);
      const outputTokens = Number(currentMonthUsage?.outputTokens || 0n);
      const cost = this.estimateCost(config.model, inputTokens, outputTokens);

      stats.push({
        provider: config.provider as AIProviderType,
        model: config.model,
        currentMonth: {
          inputTokens,
          outputTokens,
          requestCount: currentMonthUsage?.requestCount || 0,
          cacheHits: currentMonthUsage?.cacheHits || 0,
          estimatedCost: cost,
        },
        allTime: {
          inputTokens: Number(allTimeUsage._sum.inputTokens || 0n),
          outputTokens: Number(allTimeUsage._sum.outputTokens || 0n),
          requestCount: allTimeUsage._sum.requestCount || 0,
        },
      });
    }

    return stats;
  }

  /**
   * Estimate cost for token usage
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[model] || { input: 1.0, output: 1.0 };
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Get language model instance for provider
   */
  private getLanguageModel(
    provider: AIProviderType,
    model: string,
    apiKey: string
  ): LanguageModel {
    switch (provider) {
      case 'OPENAI': {
        const openai = createOpenAI({ apiKey });
        return openai(model);
      }
      case 'ANTHROPIC': {
        const anthropic = createAnthropic({ apiKey });
        return anthropic(model);
      }
      default:
        throw new BadRequestError(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Build translation context from various sources
   */
  private async buildContext(
    projectId: string,
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    keyId?: string,
    _branchId?: string
  ): Promise<AITranslationContext> {
    // Get context config
    const contextConfig = await this.prisma.aIContextConfig.findUnique({
      where: { projectId },
    });

    const config = contextConfig || DEFAULT_CONTEXT_CONFIG;

    const context: AITranslationContext = {
      sourceLanguage,
      targetLanguage,
      glossaryTerms: [],
      tmMatches: [],
      relatedTranslations: [],
    };

    // Get glossary terms
    if (config.includeGlossary) {
      try {
        const glossaryService = new GlossaryService(this.prisma);
        const matches = await glossaryService.searchInText({
          projectId,
          sourceText: text,
          sourceLanguage,
          targetLanguage,
          limit: config.glossaryLimit,
        });
        context.glossaryTerms = matches.map((m: GlossaryMatch) => ({
          source: m.sourceTerm,
          target: m.targetTerm,
          context: m.context || undefined,
        }));
      } catch (error) {
        console.warn('[AI] Failed to fetch glossary terms:', error);
      }
    }

    // Get TM matches
    if (config.includeTM) {
      try {
        const tmService = new TranslationMemoryService(this.prisma);
        const matches = await tmService.searchSimilar({
          projectId,
          sourceText: text,
          sourceLanguage,
          targetLanguage,
          minSimilarity: config.tmMinSimilarity,
          limit: config.tmLimit,
        });
        context.tmMatches = matches.map((m: TMMatch) => ({
          source: m.sourceText,
          target: m.targetText,
          similarity: m.similarity,
        }));
      } catch (error) {
        console.warn('[AI] Failed to fetch TM matches:', error);
      }
    }

    // Get related key translations
    if (config.includeRelatedKeys && keyId) {
      try {
        const keyContextService = new KeyContextService(this.prisma);
        const aiContext: AIContextResult = await keyContextService.getAIContext(
          keyId,
          targetLanguage,
          sourceLanguage
        );
        context.relatedTranslations = aiContext.relatedTranslations
          .slice(0, config.relatedKeysLimit)
          .map((r) => ({
            key: r.keyName,
            source: r.translations[sourceLanguage] || '',
            target: r.translations[targetLanguage] || '',
          }))
          .filter((r) => r.source && r.target);
      } catch (error) {
        console.warn('[AI] Failed to fetch related keys:', error);
      }
    }

    // Get project description
    if (config.includeDescription) {
      try {
        const project = await this.prisma.project.findUnique({
          where: { id: projectId },
          select: { description: true },
        });
        if (project?.description) {
          context.projectDescription = project.description;
        }
      } catch (error) {
        console.warn('[AI] Failed to fetch project description:', error);
      }
    }

    // Add custom instructions
    if (config.customInstructions) {
      context.customInstructions = config.customInstructions;
    }

    return context;
  }

  /**
   * Build system prompt for translation (XML-structured for better results)
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
   * Build user prompt with context (XML-structured)
   */
  private buildUserPrompt(text: string, context: AITranslationContext): string {
    const parts: string[] = [];

    if (context.glossaryTerms.length > 0) {
      parts.push('<glossary>');
      context.glossaryTerms.forEach((t) => {
        parts.push(`  <term source="${this.escapeXml(t.source)}" target="${this.escapeXml(t.target)}"${t.context ? ` context="${this.escapeXml(t.context)}"` : ''}/>`);
      });
      parts.push('</glossary>');
      parts.push('');
    }

    if (context.tmMatches.length > 0) {
      parts.push('<reference_translations>');
      context.tmMatches.forEach((m) => {
        parts.push(`  <example source="${this.escapeXml(m.source)}" target="${this.escapeXml(m.target)}"/>`);
      });
      parts.push('</reference_translations>');
      parts.push('');
    }

    if (context.relatedTranslations.length > 0) {
      parts.push('<related_keys>');
      context.relatedTranslations.forEach((r) => {
        parts.push(`  <key name="${this.escapeXml(r.key)}" source="${this.escapeXml(r.source)}" target="${this.escapeXml(r.target)}"/>`);
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
   * Extracts content from <translation> tags and handles fallbacks
   */
  private cleanTranslationOutput(text: string): string {
    let cleaned = text.trim();

    // Try to extract from <translation> tags first (expected format)
    const xmlMatch = cleaned.match(/<translation>([\s\S]*?)<\/translation>/i);
    if (xmlMatch) {
      cleaned = this.unescapeXml(xmlMatch[1].trim());
      return cleaned;
    }

    // Fallback: remove common prefixes that models sometimes add
    const prefixes = [
      /^(Translation|Translated|Result|Output|Here is the translation|The translation is|Перевод|Переклад|Übersetzung|Traduction):\s*/i,
      /^["'`«„"']+/,  // Leading quotes
    ];

    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '');
    }

    // Remove trailing quotes if text starts and ends with matching quotes
    const quotePairs: [string, string][] = [
      ['"', '"'],
      ["'", "'"],
      ['`', '`'],
      ['«', '»'],
      ['„', '"'],
      ['\u201C', '\u201D'],  // " "
      ['\u2018', '\u2019'],  // ' '
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

  /**
   * Select the best available provider for a project
   */
  private async selectProvider(projectId: string): Promise<AIProviderType | null> {
    const config = await this.prisma.aITranslationConfig.findFirst({
      where: {
        projectId,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });

    return config ? (config.provider as AIProviderType) : null;
  }

  /**
   * Get cached translation
   */
  private async getCachedTranslation(
    projectId: string,
    provider: AIProviderType,
    model: string,
    sourceLanguage: string,
    targetLanguage: string,
    text: string
  ): Promise<{ translatedText: string; tokenCount: number } | null> {
    const hash = this.hashText(text);

    const cached = await this.prisma.aITranslationCache.findUnique({
      where: {
        projectId_provider_model_sourceLanguage_targetLanguage_sourceTextHash: {
          projectId,
          provider: provider as AIProviderEnum,
          model,
          sourceLanguage,
          targetLanguage,
          sourceTextHash: hash,
        },
      },
    });

    // Check if expired
    if (cached && cached.expiresAt > new Date()) {
      return {
        translatedText: cached.translatedText,
        tokenCount: cached.tokenCount,
      };
    }

    return null;
  }

  /**
   * Cache a translation result
   */
  private async cacheTranslation(
    projectId: string,
    provider: AIProviderType,
    model: string,
    sourceLanguage: string,
    targetLanguage: string,
    sourceText: string,
    translatedText: string,
    tokenCount: number
  ): Promise<void> {
    const hash = this.hashText(sourceText);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await this.prisma.aITranslationCache.upsert({
      where: {
        projectId_provider_model_sourceLanguage_targetLanguage_sourceTextHash: {
          projectId,
          provider: provider as AIProviderEnum,
          model,
          sourceLanguage,
          targetLanguage,
          sourceTextHash: hash,
        },
      },
      update: {
        translatedText,
        tokenCount,
        expiresAt,
      },
      create: {
        projectId,
        provider: provider as AIProviderEnum,
        model,
        sourceLanguage,
        targetLanguage,
        sourceTextHash: hash,
        sourceText,
        translatedText,
        tokenCount,
        expiresAt,
      },
    });
  }

  /**
   * Update usage statistics
   */
  private async updateUsage(
    projectId: string,
    provider: AIProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number,
    requestCount: number,
    cacheHits: number
  ): Promise<void> {
    const yearMonth = this.getCurrentYearMonth();

    await this.prisma.aITranslationUsage.upsert({
      where: {
        projectId_provider_model_yearMonth: {
          projectId,
          provider: provider as AIProviderEnum,
          model,
          yearMonth,
        },
      },
      update: {
        inputTokens: { increment: inputTokens },
        outputTokens: { increment: outputTokens },
        requestCount: { increment: requestCount },
        cacheHits: { increment: cacheHits },
      },
      create: {
        projectId,
        provider: provider as AIProviderEnum,
        model,
        yearMonth,
        inputTokens: BigInt(inputTokens),
        outputTokens: BigInt(outputTokens),
        requestCount,
        cacheHits,
      },
    });
  }

  /**
   * Hash text for cache lookup
   */
  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Get current year-month string
   */
  private getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Format config response with masked key
   */
  private formatConfigResponse(
    config: {
      id: string;
      provider: AIProviderEnum;
      model: string;
      apiKey: string;
      apiKeyIv: string;
      isActive: boolean;
      priority: number;
      createdAt: Date;
      updatedAt: Date;
    },
    originalKey: string
  ): AIConfigResponse {
    return {
      id: config.id,
      provider: config.provider as AIProviderType,
      model: config.model,
      keyPrefix: this.getKeyPrefix(originalKey),
      isActive: config.isActive,
      priority: config.priority,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Get first 8 characters of API key for identification
   */
  private getKeyPrefix(apiKey: string): string {
    return apiKey.substring(0, 8) + '...';
  }

  // ============================================
  // ENCRYPTION (same pattern as MT service)
  // ============================================

  /**
   * Encrypt API key using AES-256-GCM
   */
  private encryptApiKey(apiKey: string): { encrypted: string; iv: string } {
    const key = this.getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted + authTag.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt API key
   */
  private decryptApiKey(encrypted: string, ivHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');

    // Split encrypted data and auth tag (last 32 hex chars = 16 bytes)
    const authTag = Buffer.from(encrypted.slice(-32), 'hex');
    const encryptedData = encrypted.slice(0, -32);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get encryption key from environment
   * Uses same key as MT service for consistency
   */
  private getEncryptionKey(): Buffer {
    const keyHex = process.env.AI_ENCRYPTION_KEY || process.env.MT_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'AI_ENCRYPTION_KEY (or MT_ENCRYPTION_KEY) must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32'
      );
    }
    return Buffer.from(keyHex, 'hex');
  }
}
