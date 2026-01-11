/**
 * AI Translation Repository
 *
 * Data access layer for AI translation configurations, caching, and usage tracking.
 * Delegates encryption to AIProviderService.
 */

import { AIContextConfig, AIProvider as AIProviderEnum, type PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { BadRequestError, NotFoundError } from '../../../plugins/error-handler.js';
import {
  AIProviderService,
  PROVIDER_MODELS,
  type AIProviderType,
} from '../services/ai-provider.service.js';

// ============================================
// CONSTANTS
// ============================================

/** Cache TTL in days */
const CACHE_TTL_DAYS = 30;

/** Default context configuration */
export const DEFAULT_CONTEXT_CONFIG: Omit<
  AIContextConfig,
  'id' | 'projectId' | 'createdAt' | 'updatedAt'
> = {
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

// ============================================
// TYPES
// ============================================

export interface AIConfigInput {
  provider: AIProviderType;
  apiKey?: string;
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

export interface CachedTranslation {
  translatedText: string;
  tokenCount: number;
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

// ============================================
// REPOSITORY
// ============================================

export class AITranslationRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiProviderService: AIProviderService
  ) {}

  // ============================================
  // CONFIGURATION MANAGEMENT
  // ============================================

  /**
   * Save or update AI provider configuration.
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
      const { encrypted, iv } = this.aiProviderService.encryptApiKey(input.apiKey);
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
      const { encrypted, iv } = this.aiProviderService.encryptApiKey(input.apiKey!);
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
    const keyForResponse =
      input.apiKey || this.aiProviderService.decryptApiKey(config.apiKey, config.apiKeyIv);
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
      keyPrefix: this.aiProviderService.getKeyPrefix(
        this.aiProviderService.decryptApiKey(config.apiKey, config.apiKeyIv)
      ),
      isActive: config.isActive,
      priority: config.priority,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));
  }

  /**
   * Get a single AI configuration by provider (with decrypted key for internal use)
   */
  async getConfig(
    projectId: string,
    provider: AIProviderType
  ): Promise<{
    id: string;
    provider: AIProviderType;
    model: string;
    apiKey: string;
    isActive: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const config = await this.prisma.aITranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: provider as AIProviderEnum,
        },
      },
    });

    if (!config) {
      return null;
    }

    return {
      id: config.id,
      provider: config.provider as AIProviderType,
      model: config.model,
      apiKey: this.aiProviderService.decryptApiKey(config.apiKey, config.apiKeyIv),
      isActive: config.isActive,
      priority: config.priority,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
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
   * Select the best available provider for a project
   */
  async selectProvider(projectId: string): Promise<AIProviderType | null> {
    const config = await this.prisma.aITranslationConfig.findFirst({
      where: {
        projectId,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });

    return config ? (config.provider as AIProviderType) : null;
  }

  // ============================================
  // CONTEXT CONFIGURATION
  // ============================================

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

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Get cached translation
   */
  async getCachedTranslation(
    projectId: string,
    provider: AIProviderType,
    model: string,
    sourceLanguage: string,
    targetLanguage: string,
    text: string
  ): Promise<CachedTranslation | null> {
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
  async cacheTranslation(
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

  // ============================================
  // USAGE TRACKING
  // ============================================

  /**
   * Update usage statistics
   */
  async updateUsage(
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
   * Get usage statistics for a project
   *
   * Uses batch queries to avoid N+1 query problem:
   * - 1 query for configs
   * - 1 query for current month usage (all providers)
   * - 1 query for all-time usage aggregates (all providers)
   */
  async getUsage(projectId: string): Promise<AIUsageStats[]> {
    const currentYearMonth = this.getCurrentYearMonth();

    // Batch query 1: Get all configs
    const configs = await this.prisma.aITranslationConfig.findMany({
      where: { projectId },
    });

    if (configs.length === 0) {
      return [];
    }

    // Batch query 2: Get current month usage for all providers in one query
    const currentMonthUsages = await this.prisma.aITranslationUsage.findMany({
      where: {
        projectId,
        yearMonth: currentYearMonth,
      },
    });

    // Batch query 3: Get all-time aggregates grouped by provider/model
    const allTimeAggregates = await this.prisma.aITranslationUsage.groupBy({
      by: ['provider', 'model'],
      where: { projectId },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        requestCount: true,
      },
    });

    // Create lookup maps for O(1) access
    const currentMonthMap = new Map(currentMonthUsages.map((u) => [`${u.provider}:${u.model}`, u]));
    const allTimeMap = new Map(allTimeAggregates.map((a) => [`${a.provider}:${a.model}`, a._sum]));

    // Build stats from configs with looked-up usage data
    return configs.map((config) => {
      const key = `${config.provider}:${config.model}`;
      const currentMonth = currentMonthMap.get(key);
      const allTime = allTimeMap.get(key);

      const inputTokens = Number(currentMonth?.inputTokens || 0n);
      const outputTokens = Number(currentMonth?.outputTokens || 0n);
      const cost = this.aiProviderService.estimateCost(config.model, inputTokens, outputTokens);

      return {
        provider: config.provider as AIProviderType,
        model: config.model,
        currentMonth: {
          inputTokens,
          outputTokens,
          requestCount: currentMonth?.requestCount || 0,
          cacheHits: currentMonth?.cacheHits || 0,
          estimatedCost: cost,
        },
        allTime: {
          inputTokens: Number(allTime?.inputTokens || 0n),
          outputTokens: Number(allTime?.outputTokens || 0n),
          requestCount: allTime?.requestCount || 0,
        },
      };
    });
  }

  // ============================================
  // PROJECT DATA ACCESS
  // ============================================

  /**
   * Get project with description
   */
  async getProject(projectId: string): Promise<{ id: string; description: string | null } | null> {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, description: true },
    });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

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
      keyPrefix: this.aiProviderService.getKeyPrefix(originalKey),
      isActive: config.isActive,
      priority: config.priority,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
