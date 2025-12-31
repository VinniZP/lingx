/**
 * Machine Translation Service
 *
 * Orchestrates MT providers, handles API key encryption, caching, and usage tracking.
 * Supports DeepL and Google Translate with per-project configuration.
 */
import { PrismaClient, MTProvider as MTProviderEnum } from '@prisma/client';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import {
  createMTProvider,
  type MTProvider,
  type MTTranslateOptions,
  type MTProviderType,
  type MTCostEstimate,
} from './providers/index.js';
import { BadRequestError, NotFoundError } from '../plugins/error-handler.js';

/** Cache TTL in days */
const CACHE_TTL_DAYS = 30;

/** Maximum batch size for translations */
const MAX_BATCH_SIZE = 50;

export interface MTConfigInput {
  provider: MTProviderType;
  apiKey: string;
  isActive?: boolean;
  priority?: number;
}

export interface MTConfigResponse {
  id: string;
  provider: MTProviderType;
  keyPrefix: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslateResult {
  translatedText: string;
  provider: MTProviderType;
  cached: boolean;
  characterCount: number;
}

export interface MTUsageStats {
  provider: MTProviderType;
  currentMonth: {
    characterCount: number;
    requestCount: number;
    cachedCount: number;
    estimatedCost: number;
  };
  allTime: {
    characterCount: number;
    requestCount: number;
  };
}

export interface BatchTranslateInput {
  keyIds: string[];
  targetLanguage: string;
  provider?: MTProviderType;
  overwriteExisting?: boolean;
}

export interface PreTranslateInput {
  branchId: string;
  targetLanguages: string[];
  provider?: MTProviderType;
}

export class MTService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // CONFIGURATION MANAGEMENT
  // ============================================

  /**
   * Save or update MT provider configuration
   */
  async saveConfig(projectId: string, input: MTConfigInput): Promise<MTConfigResponse> {
    // Encrypt the API key
    const { encrypted, iv } = this.encryptApiKey(input.apiKey);

    const config = await this.prisma.machineTranslationConfig.upsert({
      where: {
        projectId_provider: {
          projectId,
          provider: input.provider as MTProviderEnum,
        },
      },
      update: {
        apiKey: encrypted,
        apiKeyIv: iv,
        isActive: input.isActive ?? true,
        priority: input.priority ?? 0,
      },
      create: {
        projectId,
        provider: input.provider as MTProviderEnum,
        apiKey: encrypted,
        apiKeyIv: iv,
        isActive: input.isActive ?? true,
        priority: input.priority ?? 0,
      },
    });

    return this.formatConfigResponse(config, input.apiKey);
  }

  /**
   * Get all MT configurations for a project (with masked keys)
   */
  async getConfigs(projectId: string): Promise<MTConfigResponse[]> {
    const configs = await this.prisma.machineTranslationConfig.findMany({
      where: { projectId },
      orderBy: { priority: 'asc' },
    });

    return configs.map((config) => ({
      id: config.id,
      provider: config.provider as MTProviderType,
      keyPrefix: this.getKeyPrefix(this.decryptApiKey(config.apiKey, config.apiKeyIv)),
      isActive: config.isActive,
      priority: config.priority,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));
  }

  /**
   * Delete MT provider configuration
   */
  async deleteConfig(projectId: string, provider: MTProviderType): Promise<void> {
    const config = await this.prisma.machineTranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: provider as MTProviderEnum,
        },
      },
    });

    if (!config) {
      throw new NotFoundError(`MT configuration for ${provider} not found`);
    }

    await this.prisma.machineTranslationConfig.delete({
      where: { id: config.id },
    });
  }

  /**
   * Test MT provider connection
   */
  async testConnection(
    projectId: string,
    provider: MTProviderType
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const mtProvider = await this.getInitializedProvider(projectId, provider);

      // Try a simple translation
      await mtProvider.translate('Hello', 'en', 'es');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // TRANSLATION
  // ============================================

  /**
   * Translate a single text
   */
  async translate(
    projectId: string,
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    provider?: MTProviderType,
    options?: MTTranslateOptions
  ): Promise<TranslateResult> {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Text to translate cannot be empty');
    }

    // Select provider
    const selectedProvider = provider || (await this.selectProvider(projectId));
    if (!selectedProvider) {
      throw new BadRequestError('No MT provider configured for this project');
    }

    // Check cache first
    const cached = await this.getCachedTranslation(
      projectId,
      selectedProvider,
      sourceLanguage,
      targetLanguage,
      text
    );

    if (cached) {
      // Update usage stats for cache hit
      await this.updateUsage(projectId, selectedProvider, 0, 0, 1);

      return {
        translatedText: cached.translatedText,
        provider: selectedProvider,
        cached: true,
        characterCount: cached.characterCount,
      };
    }

    // Get initialized provider
    const mtProvider = await this.getInitializedProvider(projectId, selectedProvider);

    // Perform translation
    const result = await mtProvider.translate(
      text,
      sourceLanguage,
      targetLanguage,
      options
    );

    const characterCount = text.length;

    // Cache the result
    await this.cacheTranslation(
      projectId,
      selectedProvider,
      sourceLanguage,
      targetLanguage,
      text,
      result.text,
      characterCount
    );

    // Update usage stats
    await this.updateUsage(projectId, selectedProvider, characterCount, 1, 0);

    return {
      translatedText: result.text,
      provider: selectedProvider,
      cached: false,
      characterCount,
    };
  }

  /**
   * Batch translate multiple texts
   */
  async translateBatch(
    projectId: string,
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    provider?: MTProviderType,
    options?: MTTranslateOptions
  ): Promise<TranslateResult[]> {
    if (texts.length === 0) {
      return [];
    }

    if (texts.length > MAX_BATCH_SIZE) {
      throw new BadRequestError(`Batch size cannot exceed ${MAX_BATCH_SIZE}`);
    }

    // Select provider
    const selectedProvider = provider || (await this.selectProvider(projectId));
    if (!selectedProvider) {
      throw new BadRequestError('No MT provider configured for this project');
    }

    // Check cache for each text
    const results: TranslateResult[] = [];
    const uncachedTexts: { index: number; text: string }[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cached = await this.getCachedTranslation(
        projectId,
        selectedProvider,
        sourceLanguage,
        targetLanguage,
        text
      );

      if (cached) {
        results[i] = {
          translatedText: cached.translatedText,
          provider: selectedProvider,
          cached: true,
          characterCount: cached.characterCount,
        };
      } else {
        uncachedTexts.push({ index: i, text });
      }
    }

    // Translate uncached texts
    if (uncachedTexts.length > 0) {
      const mtProvider = await this.getInitializedProvider(projectId, selectedProvider);

      const translations = await mtProvider.translateBatch(
        uncachedTexts.map((t) => t.text),
        sourceLanguage,
        targetLanguage,
        options
      );

      let totalCharacters = 0;

      // Process results and cache
      for (let i = 0; i < uncachedTexts.length; i++) {
        const { index, text } = uncachedTexts[i];
        const translation = translations[i];
        const characterCount = text.length;
        totalCharacters += characterCount;

        // Cache the result
        await this.cacheTranslation(
          projectId,
          selectedProvider,
          sourceLanguage,
          targetLanguage,
          text,
          translation.text,
          characterCount
        );

        results[index] = {
          translatedText: translation.text,
          provider: selectedProvider,
          cached: false,
          characterCount,
        };
      }

      // Update usage stats
      await this.updateUsage(
        projectId,
        selectedProvider,
        totalCharacters,
        uncachedTexts.length,
        results.length - uncachedTexts.length
      );
    } else {
      // All from cache
      await this.updateUsage(projectId, selectedProvider, 0, 0, results.length);
    }

    return results;
  }

  // ============================================
  // USAGE STATISTICS
  // ============================================

  /**
   * Get usage statistics for a project
   */
  async getUsage(projectId: string): Promise<MTUsageStats[]> {
    const configs = await this.prisma.machineTranslationConfig.findMany({
      where: { projectId },
    });

    const currentYearMonth = this.getCurrentYearMonth();

    const stats: MTUsageStats[] = [];

    for (const config of configs) {
      // Get current month usage
      const currentMonthUsage = await this.prisma.machineTranslationUsage.findUnique({
        where: {
          projectId_provider_yearMonth: {
            projectId,
            provider: config.provider,
            yearMonth: currentYearMonth,
          },
        },
      });

      // Get all-time usage
      const allTimeUsage = await this.prisma.machineTranslationUsage.aggregate({
        where: {
          projectId,
          provider: config.provider,
        },
        _sum: {
          characterCount: true,
          requestCount: true,
        },
      });

      // Get cost estimate
      const mtProvider = createMTProvider(config.provider as MTProviderType);
      const cost = mtProvider.estimateCost(
        Number(currentMonthUsage?.characterCount || 0n)
      );

      stats.push({
        provider: config.provider as MTProviderType,
        currentMonth: {
          characterCount: Number(currentMonthUsage?.characterCount || 0n),
          requestCount: currentMonthUsage?.requestCount || 0,
          cachedCount: currentMonthUsage?.cachedCount || 0,
          estimatedCost: cost.cost,
        },
        allTime: {
          characterCount: Number(allTimeUsage._sum.characterCount || 0n),
          requestCount: allTimeUsage._sum.requestCount || 0,
        },
      });
    }

    return stats;
  }

  /**
   * Get cost estimate for character count
   */
  getCostEstimate(
    provider: MTProviderType,
    characterCount: number
  ): MTCostEstimate {
    const mtProvider = createMTProvider(provider);
    return mtProvider.estimateCost(characterCount);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Select the best available provider for a project
   */
  private async selectProvider(projectId: string): Promise<MTProviderType | null> {
    const config = await this.prisma.machineTranslationConfig.findFirst({
      where: {
        projectId,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });

    return config ? (config.provider as MTProviderType) : null;
  }

  /**
   * Get an initialized provider instance
   */
  private async getInitializedProvider(
    projectId: string,
    providerType: MTProviderType
  ): Promise<MTProvider> {
    const config = await this.prisma.machineTranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: providerType as MTProviderEnum,
        },
      },
    });

    if (!config) {
      throw new NotFoundError(`MT configuration for ${providerType} not found`);
    }

    if (!config.isActive) {
      throw new BadRequestError(`MT provider ${providerType} is not active`);
    }

    const apiKey = this.decryptApiKey(config.apiKey, config.apiKeyIv);
    const provider = createMTProvider(providerType);
    provider.initialize({ apiKey });

    return provider;
  }

  /**
   * Get cached translation
   */
  private async getCachedTranslation(
    projectId: string,
    provider: MTProviderType,
    sourceLanguage: string,
    targetLanguage: string,
    text: string
  ): Promise<{ translatedText: string; characterCount: number } | null> {
    const hash = this.hashText(text);

    const cached = await this.prisma.machineTranslationCache.findUnique({
      where: {
        projectId_provider_sourceLanguage_targetLanguage_sourceTextHash: {
          projectId,
          provider: provider as MTProviderEnum,
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
        characterCount: cached.characterCount,
      };
    }

    return null;
  }

  /**
   * Cache a translation result
   */
  private async cacheTranslation(
    projectId: string,
    provider: MTProviderType,
    sourceLanguage: string,
    targetLanguage: string,
    sourceText: string,
    translatedText: string,
    characterCount: number
  ): Promise<void> {
    const hash = this.hashText(sourceText);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await this.prisma.machineTranslationCache.upsert({
      where: {
        projectId_provider_sourceLanguage_targetLanguage_sourceTextHash: {
          projectId,
          provider: provider as MTProviderEnum,
          sourceLanguage,
          targetLanguage,
          sourceTextHash: hash,
        },
      },
      update: {
        translatedText,
        characterCount,
        expiresAt,
      },
      create: {
        projectId,
        provider: provider as MTProviderEnum,
        sourceLanguage,
        targetLanguage,
        sourceTextHash: hash,
        sourceText,
        translatedText,
        characterCount,
        expiresAt,
      },
    });
  }

  /**
   * Update usage statistics
   */
  private async updateUsage(
    projectId: string,
    provider: MTProviderType,
    characterCount: number,
    requestCount: number,
    cachedCount: number
  ): Promise<void> {
    const yearMonth = this.getCurrentYearMonth();

    await this.prisma.machineTranslationUsage.upsert({
      where: {
        projectId_provider_yearMonth: {
          projectId,
          provider: provider as MTProviderEnum,
          yearMonth,
        },
      },
      update: {
        characterCount: {
          increment: characterCount,
        },
        requestCount: {
          increment: requestCount,
        },
        cachedCount: {
          increment: cachedCount,
        },
      },
      create: {
        projectId,
        provider: provider as MTProviderEnum,
        yearMonth,
        characterCount: BigInt(characterCount),
        requestCount,
        cachedCount,
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
      provider: MTProviderEnum;
      apiKey: string;
      apiKeyIv: string;
      isActive: boolean;
      priority: number;
      createdAt: Date;
      updatedAt: Date;
    },
    originalKey: string
  ): MTConfigResponse {
    return {
      id: config.id,
      provider: config.provider as MTProviderType,
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
  // ENCRYPTION (same pattern as TOTP service)
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
   */
  private getEncryptionKey(): Buffer {
    const keyHex = process.env.MT_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'MT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32'
      );
    }
    return Buffer.from(keyHex, 'hex');
  }

  // ============================================
  // GLOSSARY MANAGEMENT
  // ============================================

  /**
   * Create a glossary on the MT provider
   *
   * @param projectId - Project ID
   * @param provider - MT provider type
   * @param name - Glossary name
   * @param sourceLanguage - Source language code
   * @param targetLanguage - Target language code
   * @param entries - Glossary entries (source/target pairs)
   * @returns External glossary ID from provider
   */
  async createGlossary(
    projectId: string,
    provider: MTProviderType,
    name: string,
    sourceLanguage: string,
    targetLanguage: string,
    entries: Array<{ source: string; target: string }>
  ): Promise<string> {
    const mtProvider = await this.getInitializedProvider(projectId, provider);

    if (!mtProvider.createGlossary) {
      throw new BadRequestError(`Provider ${provider} does not support glossaries`);
    }

    return mtProvider.createGlossary(name, sourceLanguage, targetLanguage, entries);
  }

  /**
   * Delete a glossary from the MT provider
   *
   * @param projectId - Project ID
   * @param provider - MT provider type
   * @param glossaryId - External glossary ID
   */
  async deleteGlossary(
    projectId: string,
    provider: MTProviderType,
    glossaryId: string
  ): Promise<void> {
    const mtProvider = await this.getInitializedProvider(projectId, provider);

    if (!mtProvider.deleteGlossary) {
      throw new BadRequestError(`Provider ${provider} does not support glossaries`);
    }

    await mtProvider.deleteGlossary(glossaryId);
  }

  /**
   * List glossaries from the MT provider
   *
   * @param projectId - Project ID
   * @param provider - MT provider type
   */
  async listGlossaries(
    projectId: string,
    provider: MTProviderType
  ): Promise<
    Array<{
      id: string;
      name: string;
      sourceLanguage: string;
      targetLanguage: string;
      entryCount: number;
    }>
  > {
    const mtProvider = await this.getInitializedProvider(projectId, provider);

    if (!mtProvider.listGlossaries) {
      throw new BadRequestError(`Provider ${provider} does not support glossaries`);
    }

    return mtProvider.listGlossaries();
  }
}
