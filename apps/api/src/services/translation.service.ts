/**
 * Translation Service
 *
 * Handles translation key and value CRUD operations.
 * Per Design Doc: AC-WEB-007 through AC-WEB-011
 */
import { PrismaClient, TranslationKey, Translation, ApprovalStatus } from '@prisma/client';
import { FieldValidationError, NotFoundError } from '../plugins/error-handler.js';
import { UNIQUE_VIOLATION_CODES } from '@localeflow/shared';

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
   * @throws FieldValidationError if key name already exists in branch
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
      throw new FieldValidationError(
        [
          {
            field: 'name',
            message: 'A key with this name already exists in this branch',
            code: UNIQUE_VIOLATION_CODES.TRANSLATION_KEY,
          },
        ],
        'Key with this name already exists in the branch'
      );
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
   * Find keys by branch ID with pagination, search, and status filter
   *
   * @param branchId - Branch ID
   * @param options - Pagination, search, and status filter options
   * @returns Paginated list of keys with translations
   */
  async findKeysByBranchId(
    branchId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      filter?: 'all' | 'missing' | 'complete' | 'pending' | 'approved' | 'rejected';
    } = {}
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    // For 'missing' and 'complete' filters, we need to know the language count
    // Get the project's language count first
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        space: {
          select: {
            project: {
              select: {
                languages: {
                  select: { code: true },
                },
              },
            },
          },
        },
      },
    });

    const languageCount = branch?.space.project.languages.length || 0;

    // For 'missing' and 'complete' filters, use raw SQL for efficiency
    if (options.filter === 'missing' || options.filter === 'complete') {
      return this.findKeysByCompletionFilter(branchId, options, languageCount);
    }

    // Build the where clause for other filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { branchId };

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Filter by approval status - keys that have at least one translation with this status
    if (options.filter === 'pending' || options.filter === 'approved' || options.filter === 'rejected') {
      const statusMap = {
        pending: 'PENDING',
        approved: 'APPROVED',
        rejected: 'REJECTED',
      } as const;
      where.translations = {
        some: {
          status: statusMap[options.filter],
          value: { not: '' }, // Only consider translations with actual values
        },
      };
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
   * Find keys by completion filter (missing or complete)
   * Uses raw SQL for efficiency with aggregation
   */
  private async findKeysByCompletionFilter(
    branchId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      filter?: 'all' | 'missing' | 'complete' | 'pending' | 'approved' | 'rejected';
    },
    languageCount: number
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    // For 'missing': keys where translation count < language count
    // For 'complete': keys where non-empty translation count >= language count
    const comparison = options.filter === 'missing' ? '<' : '>=';

    // Build query with search if provided
    let keyIdsQuery: string;
    let countQuery: string;
    let params: (string | number)[];

    if (options.search) {
      keyIdsQuery = `
        SELECT tk.id
        FROM "TranslationKey" tk
        LEFT JOIN "Translation" t ON t."keyId" = tk.id
        WHERE tk."branchId" = $1
          AND (tk.name ILIKE '%' || $2 || '%' OR tk.description ILIKE '%' || $2 || '%')
        GROUP BY tk.id
        HAVING COUNT(CASE WHEN t.value IS NOT NULL AND t.value != '' THEN 1 END) ${comparison} $3
        ORDER BY tk.name ASC
        LIMIT $4 OFFSET $5
      `;
      countQuery = `
        SELECT COUNT(*)::int as count FROM (
          SELECT tk.id
          FROM "TranslationKey" tk
          LEFT JOIN "Translation" t ON t."keyId" = tk.id
          WHERE tk."branchId" = $1
            AND (tk.name ILIKE '%' || $2 || '%' OR tk.description ILIKE '%' || $2 || '%')
          GROUP BY tk.id
          HAVING COUNT(CASE WHEN t.value IS NOT NULL AND t.value != '' THEN 1 END) ${comparison} $3
        ) subquery
      `;
      params = [branchId, options.search, languageCount, limit, offset];
    } else {
      keyIdsQuery = `
        SELECT tk.id
        FROM "TranslationKey" tk
        LEFT JOIN "Translation" t ON t."keyId" = tk.id
        WHERE tk."branchId" = $1
        GROUP BY tk.id
        HAVING COUNT(CASE WHEN t.value IS NOT NULL AND t.value != '' THEN 1 END) ${comparison} $2
        ORDER BY tk.name ASC
        LIMIT $3 OFFSET $4
      `;
      countQuery = `
        SELECT COUNT(*)::int as count FROM (
          SELECT tk.id
          FROM "TranslationKey" tk
          LEFT JOIN "Translation" t ON t."keyId" = tk.id
          WHERE tk."branchId" = $1
          GROUP BY tk.id
          HAVING COUNT(CASE WHEN t.value IS NOT NULL AND t.value != '' THEN 1 END) ${comparison} $2
        ) subquery
      `;
      params = [branchId, languageCount, limit, offset];
    }

    const [keyIdResults, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ id: string }>>(keyIdsQuery, ...params),
      this.prisma.$queryRawUnsafe<Array<{ count: number }>>(countQuery, ...params.slice(0, options.search ? 3 : 2)),
    ]);

    const keyIds = keyIdResults.map((r) => r.id);
    const total = countResult[0]?.count || 0;

    // Fetch full keys with translations
    const keys = keyIds.length > 0
      ? await this.prisma.translationKey.findMany({
          where: { id: { in: keyIds } },
          include: {
            translations: {
              orderBy: { language: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        })
      : [];

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
   * @throws FieldValidationError if new name already exists
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
        throw new FieldValidationError(
          [
            {
              field: 'name',
              message: 'A key with this name already exists in this branch',
              code: UNIQUE_VIOLATION_CODES.TRANSLATION_KEY,
            },
          ],
          'Key with this name already exists'
        );
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
   * Auto-resets approval status to PENDING when value changes
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

    // Check if translation exists and if value is changing
    const existing = await this.prisma.translation.findUnique({
      where: { keyId_language: { keyId, language } },
    });

    const valueChanged = existing && existing.value !== value;

    return this.prisma.translation.upsert({
      where: {
        keyId_language: {
          keyId,
          language,
        },
      },
      update: {
        value,
        // Reset approval status if value changed
        ...(valueChanged && {
          status: 'PENDING' as ApprovalStatus,
          statusUpdatedAt: null,
          statusUpdatedBy: null,
        }),
      },
      create: {
        keyId,
        language,
        value,
        status: 'PENDING' as ApprovalStatus,
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
   * Auto-resets approval status to PENDING when value changes
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
      include: { translations: true },
    });

    if (!key) {
      throw new NotFoundError('Translation key');
    }

    // Build a map of existing translations for comparison
    const existingMap = new Map(
      key.translations.map((t) => [t.language, t.value])
    );

    // Upsert all translations with status reset on change
    for (const [language, value] of Object.entries(translations)) {
      const existingValue = existingMap.get(language);
      const valueChanged = existingValue !== undefined && existingValue !== value;

      await this.prisma.translation.upsert({
        where: {
          keyId_language: { keyId, language },
        },
        update: {
          value,
          // Reset approval status if value changed
          ...(valueChanged && {
            status: 'PENDING' as ApprovalStatus,
            statusUpdatedAt: null,
            statusUpdatedBy: null,
          }),
        },
        create: {
          keyId,
          language,
          value,
          status: 'PENDING' as ApprovalStatus,
        },
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
   * Auto-resets approval status to PENDING when value changes
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

          // Upsert translation with status reset on change
          const existing = await tx.translation.findUnique({
            where: {
              keyId_language: { keyId: key.id, language },
            },
          });

          if (existing) {
            const valueChanged = existing.value !== value;
            await tx.translation.update({
              where: { id: existing.id },
              data: {
                value,
                // Reset approval status if value changed
                ...(valueChanged && {
                  status: 'PENDING' as ApprovalStatus,
                  statusUpdatedAt: null,
                  statusUpdatedBy: null,
                }),
              },
            });
            updated++;
          } else {
            await tx.translation.create({
              data: {
                keyId: key.id,
                language,
                value,
                status: 'PENDING' as ApprovalStatus,
              },
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

  // ============================================
  // APPROVAL WORKFLOW
  // ============================================

  /**
   * Find translation by ID
   *
   * @param id - Translation ID
   * @returns Translation or null
   */
  async findTranslationById(id: string): Promise<Translation | null> {
    return this.prisma.translation.findUnique({
      where: { id },
    });
  }

  /**
   * Get project ID by translation ID (for authorization)
   *
   * @param translationId - Translation ID
   * @returns Project ID or null if translation doesn't exist
   */
  async getProjectIdByTranslationId(translationId: string): Promise<string | null> {
    const translation = await this.prisma.translation.findUnique({
      where: { id: translationId },
      select: {
        key: {
          select: {
            branch: {
              select: {
                space: {
                  select: { projectId: true },
                },
              },
            },
          },
        },
      },
    });
    return translation?.key?.branch?.space?.projectId || null;
  }

  /**
   * Set approval status for a single translation
   *
   * @param translationId - Translation ID
   * @param status - Approval status (APPROVED or REJECTED)
   * @param userId - User ID who is setting the status
   * @returns Updated translation
   * @throws NotFoundError if translation doesn't exist
   */
  async setApprovalStatus(
    translationId: string,
    status: 'APPROVED' | 'REJECTED',
    userId: string
  ): Promise<Translation> {
    const translation = await this.prisma.translation.findUnique({
      where: { id: translationId },
    });

    if (!translation) {
      throw new NotFoundError('Translation');
    }

    return this.prisma.translation.update({
      where: { id: translationId },
      data: {
        status: status as ApprovalStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: userId,
      },
    });
  }

  /**
   * Batch set approval status for multiple translations
   *
   * @param translationIds - Array of translation IDs
   * @param status - Approval status (APPROVED or REJECTED)
   * @param userId - User ID who is setting the status
   * @returns Number of updated translations
   */
  async batchSetApprovalStatus(
    translationIds: string[],
    status: 'APPROVED' | 'REJECTED',
    userId: string
  ): Promise<number> {
    const result = await this.prisma.translation.updateMany({
      where: { id: { in: translationIds } },
      data: {
        status: status as ApprovalStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: userId,
      },
    });
    return result.count;
  }

  /**
   * Get pending approval count for a set of branch IDs
   * Only counts non-empty translations
   *
   * @param branchIds - Array of branch IDs
   * @returns Count of pending translations
   */
  async getPendingApprovalCount(branchIds: string[]): Promise<number> {
    return this.prisma.translation.count({
      where: {
        key: { branchId: { in: branchIds } },
        status: 'PENDING',
        value: { not: '' },
      },
    });
  }

  /**
   * Verify that all translation IDs belong to the same project
   *
   * @param translationIds - Array of translation IDs
   * @returns Project ID if all translations belong to the same project, null otherwise
   */
  async verifyTranslationsBelongToSameProject(
    translationIds: string[]
  ): Promise<string | null> {
    const translations = await this.prisma.translation.findMany({
      where: { id: { in: translationIds } },
      select: {
        key: {
          select: {
            branch: {
              select: {
                space: {
                  select: { projectId: true },
                },
              },
            },
          },
        },
      },
    });

    if (translations.length !== translationIds.length) {
      return null; // Some translations not found
    }

    const projectIds = new Set(
      translations.map((t) => t.key.branch.space.projectId)
    );

    if (projectIds.size !== 1) {
      return null; // Translations belong to different projects
    }

    return [...projectIds][0];
  }
}
