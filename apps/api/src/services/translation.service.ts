/**
 * Translation Service
 *
 * Handles translation key and value CRUD operations.
 * Per Design Doc: AC-WEB-007 through AC-WEB-011
 */
import { PrismaClient, TranslationKey, Translation } from '@prisma/client';
import { ConflictError, NotFoundError } from '../plugins/error-handler.js';

export interface CreateKeyInput {
  name: string;
  description?: string;
  branchId: string;
}

export interface UpdateKeyInput {
  name?: string;
  description?: string;
}

export interface KeyWithTranslations extends TranslationKey {
  translations: Translation[];
}

export interface KeyListResult {
  keys: KeyWithTranslations[];
  total: number;
  page: number;
  limit: number;
}

export interface BranchTranslations {
  translations: Record<string, Record<string, string>>;
  languages: string[];
}

export interface BulkUpdateResult {
  updated: number;
  created: number;
}

export class TranslationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new translation key
   *
   * @param input - Key creation data
   * @returns Created key with translations
   * @throws ConflictError if key name already exists in branch
   */
  async createKey(input: CreateKeyInput): Promise<KeyWithTranslations> {
    // Check for duplicate key name in branch
    const existing = await this.prisma.translationKey.findUnique({
      where: {
        branchId_name: {
          branchId: input.branchId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Key with this name already exists in the branch');
    }

    const key = await this.prisma.translationKey.create({
      data: {
        name: input.name,
        description: input.description,
        branchId: input.branchId,
      },
      include: {
        translations: true,
      },
    });

    return key;
  }

  /**
   * Find key by ID with translations
   *
   * @param id - Key ID
   * @returns Key with translations or null
   */
  async findKeyById(id: string): Promise<KeyWithTranslations | null> {
    return this.prisma.translationKey.findUnique({
      where: { id },
      include: {
        translations: {
          orderBy: { language: 'asc' },
        },
      },
    });
  }

  /**
   * Find keys by branch ID with pagination and search
   *
   * @param branchId - Branch ID
   * @param options - Pagination and search options
   * @returns Paginated list of keys with translations
   */
  async findKeysByBranchId(
    branchId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: {
      branchId: string;
      OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }>;
    } = { branchId };

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [keys, total] = await Promise.all([
      this.prisma.translationKey.findMany({
        where,
        include: {
          translations: {
            orderBy: { language: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.translationKey.count({ where }),
    ]);

    return {
      keys,
      total,
      page,
      limit,
    };
  }

  /**
   * Update translation key
   *
   * @param id - Key ID
   * @param input - Update data
   * @returns Updated key with translations
   * @throws NotFoundError if key doesn't exist
   * @throws ConflictError if new name already exists
   */
  async updateKey(id: string, input: UpdateKeyInput): Promise<KeyWithTranslations> {
    const existing = await this.prisma.translationKey.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Translation key');
    }

    // If renaming, check for conflicts
    if (input.name && input.name !== existing.name) {
      const conflict = await this.prisma.translationKey.findUnique({
        where: {
          branchId_name: {
            branchId: existing.branchId,
            name: input.name,
          },
        },
      });

      if (conflict) {
        throw new ConflictError('Key with this name already exists');
      }
    }

    return this.prisma.translationKey.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
      include: {
        translations: true,
      },
    });
  }

  /**
   * Delete translation key
   *
   * @param id - Key ID
   * @throws NotFoundError if key doesn't exist
   */
  async deleteKey(id: string): Promise<void> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id },
    });

    if (!key) {
      throw new NotFoundError('Translation key');
    }

    await this.prisma.translationKey.delete({
      where: { id },
    });
  }

  /**
   * Bulk delete translation keys
   *
   * @param branchId - Branch ID
   * @param keyIds - Array of key IDs to delete
   * @returns Number of deleted keys
   * @throws NotFoundError if some keys don't exist or don't belong to branch
   */
  async bulkDeleteKeys(branchId: string, keyIds: string[]): Promise<number> {
    // Verify all keys belong to the branch
    const keys = await this.prisma.translationKey.findMany({
      where: {
        id: { in: keyIds },
        branchId,
      },
    });

    if (keys.length !== keyIds.length) {
      throw new NotFoundError('Some translation keys');
    }

    const result = await this.prisma.translationKey.deleteMany({
      where: {
        id: { in: keyIds },
        branchId,
      },
    });

    return result.count;
  }

  /**
   * Set translation for a key in a specific language
   *
   * @param keyId - Key ID
   * @param language - Language code
   * @param value - Translation value
   * @returns Created or updated translation
   * @throws NotFoundError if key doesn't exist
   */
  async setTranslation(
    keyId: string,
    language: string,
    value: string
  ): Promise<Translation> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundError('Translation key');
    }

    return this.prisma.translation.upsert({
      where: {
        keyId_language: {
          keyId,
          language,
        },
      },
      update: { value },
      create: {
        keyId,
        language,
        value,
      },
    });
  }

  /**
   * Delete translation for a key in a specific language
   *
   * @param keyId - Key ID
   * @param language - Language code
   */
  async deleteTranslation(keyId: string, language: string): Promise<void> {
    await this.prisma.translation.delete({
      where: {
        keyId_language: {
          keyId,
          language,
        },
      },
    });
  }

  /**
   * Update all translations for a key at once
   *
   * @param keyId - Key ID
   * @param translations - Map of language code to translation value
   * @returns Updated key with translations
   * @throws NotFoundError if key doesn't exist
   */
  async updateKeyTranslations(
    keyId: string,
    translations: Record<string, string>
  ): Promise<KeyWithTranslations> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundError('Translation key');
    }

    // Upsert all translations
    for (const [language, value] of Object.entries(translations)) {
      await this.prisma.translation.upsert({
        where: {
          keyId_language: { keyId, language },
        },
        update: { value },
        create: { keyId, language, value },
      });
    }

    return this.prisma.translationKey.findUnique({
      where: { id: keyId },
      include: { translations: true },
    }) as Promise<KeyWithTranslations>;
  }

  /**
   * Get all translations for a branch in bulk format
   * Used for CLI pull operations
   *
   * @param branchId - Branch ID
   * @returns Translations grouped by language then key name
   */
  async getBranchTranslations(branchId: string): Promise<BranchTranslations> {
    const keys = await this.prisma.translationKey.findMany({
      where: { branchId },
      include: { translations: true },
    });

    // Transform to { language: { key: value } } format
    const translations: Record<string, Record<string, string>> = {};

    for (const key of keys) {
      for (const trans of key.translations) {
        if (!translations[trans.language]) {
          translations[trans.language] = {};
        }
        translations[trans.language][key.name] = trans.value;
      }
    }

    // Extract unique languages
    const languages = Object.keys(translations);

    return { translations, languages };
  }

  /**
   * Bulk update translations for a branch
   * Used for CLI push operations
   *
   * @param branchId - Branch ID
   * @param translations - Translations grouped by language then key name
   * @returns Count of updated and created translations
   */
  async bulkUpdateTranslations(
    branchId: string,
    translations: Record<string, Record<string, string>>
  ): Promise<BulkUpdateResult> {
    let updated = 0;
    let created = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const [language, keyValues] of Object.entries(translations)) {
        for (const [keyName, value] of Object.entries(keyValues)) {
          // Find or create key
          let key = await tx.translationKey.findUnique({
            where: {
              branchId_name: { branchId, name: keyName },
            },
          });

          if (!key) {
            key = await tx.translationKey.create({
              data: { branchId, name: keyName },
            });
            created++;
          }

          // Upsert translation
          const existing = await tx.translation.findUnique({
            where: {
              keyId_language: { keyId: key.id, language },
            },
          });

          if (existing) {
            await tx.translation.update({
              where: { id: existing.id },
              data: { value },
            });
            updated++;
          } else {
            await tx.translation.create({
              data: { keyId: key.id, language, value },
            });
            created++;
          }
        }
      }
    });

    return { updated, created };
  }

  /**
   * Get branch ID by key ID
   *
   * @param keyId - Key ID
   * @returns Branch ID or null if key doesn't exist
   */
  async getBranchIdByKeyId(keyId: string): Promise<string | null> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
      select: { branchId: true },
    });
    return key?.branchId || null;
  }

  /**
   * Get project ID by key ID (for authorization)
   *
   * @param keyId - Key ID
   * @returns Project ID or null if key doesn't exist
   */
  async getProjectIdByKeyId(keyId: string): Promise<string | null> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
      select: {
        branch: {
          select: {
            space: {
              select: { projectId: true },
            },
          },
        },
      },
    });
    return key?.branch?.space?.projectId || null;
  }
}
