/**
 * Machine Translation Repository
 *
 * Data access layer for MT configurations, caching, and usage tracking.
 * Handles API key encryption/decryption and provider configuration.
 */

import { MTProvider as MTProviderEnum, type PrismaClient } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { NotFoundError } from '../../../plugins/error-handler.js';
import {
  createMTProvider,
  type MTProvider,
  type MTProviderType,
} from '../../../services/providers/index.js';

// ============================================
// TYPES
// ============================================

/** Cache TTL in days */
const CACHE_TTL_DAYS = 30;

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

export interface CachedTranslation {
  translatedText: string;
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

// ============================================
// REPOSITORY
// ============================================

export class MachineTranslationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================
  // CONFIGURATION MANAGEMENT
  // ============================================

  /**
   * Save or update MT provider configuration
   */
  async saveConfig(projectId: string, input: MTConfigInput): Promise<MTConfigResponse> {
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
   * Get a single MT configuration by provider
   */
  async getConfig(
    projectId: string,
    provider: MTProviderType
  ): Promise<{
    id: string;
    provider: MTProviderType;
    apiKey: string;
    isActive: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const config = await this.prisma.machineTranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: provider as MTProviderEnum,
        },
      },
    });

    if (!config) {
      return null;
    }

    return {
      id: config.id,
      provider: config.provider as MTProviderType,
      apiKey: this.decryptApiKey(config.apiKey, config.apiKeyIv),
      isActive: config.isActive,
      priority: config.priority,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
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
      throw new NotFoundError(`MT configuration for ${provider}`);
    }

    await this.prisma.machineTranslationConfig.delete({
      where: { id: config.id },
    });
  }

  /**
   * Select the best available provider for a project
   */
  async selectProvider(projectId: string): Promise<MTProviderType | null> {
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
  async getInitializedProvider(
    projectId: string,
    providerType: MTProviderType
  ): Promise<MTProvider> {
    const config = await this.getConfig(projectId, providerType);

    if (!config) {
      throw new NotFoundError(`MT configuration for ${providerType}`);
    }

    if (!config.isActive) {
      throw new Error(`MT provider ${providerType} is not active`);
    }

    const provider = createMTProvider(providerType);
    provider.initialize({ apiKey: config.apiKey });

    return provider;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Get cached translation
   */
  async getCachedTranslation(
    projectId: string,
    provider: MTProviderType,
    sourceLanguage: string,
    targetLanguage: string,
    text: string
  ): Promise<CachedTranslation | null> {
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
  async cacheTranslation(
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

  // ============================================
  // USAGE TRACKING
  // ============================================

  /**
   * Update usage statistics
   */
  async updateUsage(
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
      const cost = mtProvider.estimateCost(Number(currentMonthUsage?.characterCount || 0n));

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

  // ============================================
  // PROJECT DATA ACCESS
  // ============================================

  /**
   * Get project with default language
   */
  async getProject(projectId: string): Promise<{ id: string; defaultLanguage: string } | null> {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, defaultLanguage: true },
    });
  }

  /**
   * Get translation keys with source translations for batch operations
   */
  async getKeysWithSourceTranslations(
    keyIds: string[],
    sourceLanguage: string
  ): Promise<
    Array<{
      id: string;
      translations: Array<{ value: string | null }>;
    }>
  > {
    return this.prisma.translationKey.findMany({
      where: { id: { in: keyIds } },
      include: {
        translations: {
          where: { language: sourceLanguage },
        },
      },
    });
  }

  /**
   * Get translation keys for a branch with source translations
   */
  async getBranchKeysWithSourceTranslations(
    branchId: string,
    sourceLanguage: string
  ): Promise<
    Array<{
      id: string;
      translations: Array<{ value: string | null }>;
    }>
  > {
    return this.prisma.translationKey.findMany({
      where: { branchId },
      include: {
        translations: {
          where: { language: sourceLanguage },
        },
      },
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
  // ENCRYPTION
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
   * Get encryption key from environment.
   * Uses AI_ENCRYPTION_KEY with fallback to MT_ENCRYPTION_KEY for consistency
   * with other services (ai-translation.service, api-key-decryptor).
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
