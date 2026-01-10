/**
 * Translation Repository
 *
 * Data access layer for translation keys and values.
 * Handles all database operations related to translations.
 */

import { UNIQUE_VIOLATION_CODES, combineKey, parseNamespacedKey } from '@lingx/shared';
import type {
  ApprovalStatus,
  Prisma,
  PrismaClient,
  Translation,
  TranslationKey,
  TranslationQualityScore,
} from '@prisma/client';
import { FieldValidationError, NotFoundError } from '../../../plugins/error-handler.js';

// ============================================
// Types
// ============================================

export interface CreateKeyInput {
  name: string;
  namespace?: string | null;
  description?: string;
  branchId: string;
}

export interface UpdateKeyInput {
  name?: string;
  namespace?: string | null;
  description?: string;
}

export interface TranslationWithQualityScore extends Translation {
  qualityScore: TranslationQualityScore | null;
}

export interface KeyWithTranslations extends TranslationKey {
  translations: TranslationWithQualityScore[];
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

export interface NamespaceCount {
  namespace: string | null;
  count: number;
}

export interface BranchInfo {
  languageCount: number;
  sourceLanguage: string;
  enabledLanguages: string[];
}

/**
 * Translation with key info for quality batch processing
 */
export interface QualityBatchTranslation {
  id: string;
  keyId: string;
  language: string;
  value: string;
  key: { name: string };
}

/**
 * Result of findTranslationsForQualityBatch
 */
export interface QualityBatchResult {
  translations: QualityBatchTranslation[];
  sourceLanguage: string;
}

export type KeyFilter =
  | 'all'
  | 'missing'
  | 'complete'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'warnings';
export type QualityFilter = 'all' | 'excellent' | 'good' | 'needsReview' | 'unscored';

export interface ListKeysOptions {
  search?: string;
  page?: number;
  limit?: number;
  filter?: KeyFilter;
  qualityFilter?: QualityFilter;
  namespace?: string; // Use "__root__" for keys without namespace
}

// ============================================
// Repository
// ============================================

export class TranslationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================
  // Key Operations
  // ============================================

  /**
   * Create a new translation key
   * @throws FieldValidationError if key name already exists in branch+namespace
   */
  async createKey(input: CreateKeyInput): Promise<KeyWithTranslations> {
    const namespace = input.namespace ?? null;

    // Check for duplicate key name in branch+namespace
    const existing = await this.prisma.translationKey.findFirst({
      where: {
        branchId: input.branchId,
        namespace: namespace,
        name: input.name,
      },
    });

    if (existing) {
      throw new FieldValidationError(
        [
          {
            field: 'name',
            message: 'A key with this name already exists in this branch/namespace',
            code: UNIQUE_VIOLATION_CODES.TRANSLATION_KEY,
          },
        ],
        'Key with this name already exists in the branch/namespace'
      );
    }

    const key = await this.prisma.translationKey.create({
      data: {
        name: input.name,
        namespace: namespace,
        description: input.description,
        branchId: input.branchId,
      },
      include: {
        translations: {
          include: { qualityScore: true },
        },
      },
    });

    return key as KeyWithTranslations;
  }

  /**
   * Find key by ID with translations
   */
  async findKeyById(id: string): Promise<KeyWithTranslations | null> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id },
      include: {
        translations: {
          include: { qualityScore: true },
          orderBy: { language: 'asc' },
        },
      },
    });
    return key as KeyWithTranslations | null;
  }

  /**
   * Get branch info for filtering operations
   */
  async getBranchInfo(branchId: string): Promise<BranchInfo | null> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        space: {
          select: {
            project: {
              select: {
                defaultLanguage: true,
                languages: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    if (!branch) return null;

    const languages = branch.space.project.languages.map((l) => l.code);
    return {
      languageCount: languages.length,
      sourceLanguage: branch.space.project.defaultLanguage || languages[0] || 'en',
      enabledLanguages: languages,
    };
  }

  /**
   * Find keys by branch ID with pagination, search, and filters
   */
  async findKeysByBranchId(
    branchId: string,
    options: ListKeysOptions = {}
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const branchInfo = await this.getBranchInfo(branchId);
    if (!branchInfo) {
      return { keys: [], total: 0, page, limit };
    }

    // For 'missing' and 'complete' filters, use raw SQL for efficiency
    if (options.filter === 'missing' || options.filter === 'complete') {
      return this.findKeysByCompletionFilter(branchId, options, branchInfo.languageCount);
    }

    // For quality score filters, use dedicated method
    if (options.qualityFilter && options.qualityFilter !== 'all') {
      return this.findKeysByQualityScoreFilter(branchId, options, branchInfo.enabledLanguages);
    }

    // Build the where clause for standard filters
    const where: Prisma.TranslationKeyWhereInput = { branchId };

    // Filter by namespace (use "__root__" for keys without namespace)
    if (options.namespace !== undefined) {
      where.namespace = options.namespace === '__root__' ? null : options.namespace;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Filter by approval status
    if (
      options.filter === 'pending' ||
      options.filter === 'approved' ||
      options.filter === 'rejected'
    ) {
      const statusMap = {
        pending: 'PENDING',
        approved: 'APPROVED',
        rejected: 'REJECTED',
      } as const;
      where.translations = {
        some: {
          status: statusMap[options.filter],
          value: { not: '' },
        },
      };
    }

    // Filter by quality warnings (format issues)
    if (options.filter === 'warnings') {
      where.translations = {
        some: {
          value: { not: '' },
          qualityScore: {
            formatScore: { lt: 100 },
          },
        },
      };
    }

    const [keys, total] = await Promise.all([
      this.prisma.translationKey.findMany({
        where,
        include: {
          translations: {
            include: { qualityScore: true },
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
      keys: keys as KeyWithTranslations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Find keys by completion filter (missing or complete) using raw SQL
   */
  private async findKeysByCompletionFilter(
    branchId: string,
    options: ListKeysOptions,
    languageCount: number
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const comparison = options.filter === 'missing' ? '<' : '>=';

    // Build namespace filter condition
    const hasNamespaceFilter = options.namespace !== undefined;
    const namespaceValue: string | null =
      options.namespace === '__root__' ? null : (options.namespace ?? null);

    // Build WHERE conditions dynamically
    const whereConditions = ['tk."branchId" = $1'];
    let paramIndex = 2;

    if (hasNamespaceFilter) {
      if (namespaceValue === null) {
        whereConditions.push('tk.namespace IS NULL');
      } else {
        whereConditions.push(`tk.namespace = $${paramIndex}`);
        paramIndex++;
      }
    }

    if (options.search) {
      whereConditions.push(
        `(tk.name ILIKE '%' || $${paramIndex} || '%' OR tk.description ILIKE '%' || $${paramIndex} || '%')`
      );
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const havingParam = paramIndex;

    const keyIdsQuery = `
      SELECT tk.id
      FROM "TranslationKey" tk
      LEFT JOIN "Translation" t ON t."keyId" = tk.id
      WHERE ${whereClause}
      GROUP BY tk.id
      HAVING COUNT(CASE WHEN t.value IS NOT NULL AND t.value != '' THEN 1 END) ${comparison} $${havingParam}
      ORDER BY tk.name ASC
      LIMIT $${havingParam + 1} OFFSET $${havingParam + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)::int as count FROM (
        SELECT tk.id
        FROM "TranslationKey" tk
        LEFT JOIN "Translation" t ON t."keyId" = tk.id
        WHERE ${whereClause}
        GROUP BY tk.id
        HAVING COUNT(CASE WHEN t.value IS NOT NULL AND t.value != '' THEN 1 END) ${comparison} $${havingParam}
      ) subquery
    `;

    // Build params array
    const params: (string | number | null)[] = [branchId];
    if (hasNamespaceFilter && namespaceValue !== null) {
      params.push(namespaceValue);
    }
    if (options.search) {
      params.push(options.search);
    }
    const countParams = [...params, languageCount];
    params.push(languageCount, limit, offset);

    const [keyIdResults, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ id: string }>>(keyIdsQuery, ...params),
      this.prisma.$queryRawUnsafe<Array<{ count: number }>>(countQuery, ...countParams),
    ]);

    const keyIds = keyIdResults.map((r) => r.id);
    const total = countResult[0]?.count || 0;

    // Fetch full keys with translations
    const keys =
      keyIds.length > 0
        ? await this.prisma.translationKey.findMany({
            where: { id: { in: keyIds } },
            include: {
              translations: {
                include: { qualityScore: true },
                orderBy: { language: 'asc' },
              },
            },
            orderBy: { name: 'asc' },
          })
        : [];

    return {
      keys: keys as KeyWithTranslations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Find keys by quality score filter
   */
  private async findKeysByQualityScoreFilter(
    branchId: string,
    options: ListKeysOptions,
    enabledLanguages: string[]
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;

    const where: Prisma.TranslationKeyWhereInput = { branchId };

    if (options.namespace !== undefined) {
      where.namespace = options.namespace === '__root__' ? null : options.namespace;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const qualityFilter = options.qualityFilter;
    if (qualityFilter === 'unscored') {
      where.translations = {
        some: {
          language: { in: enabledLanguages },
          value: { not: '' },
          qualityScore: null,
        },
      };
    } else if (qualityFilter === 'excellent') {
      where.translations = {
        some: {
          language: { in: enabledLanguages },
          qualityScore: { score: { gte: 80 } },
        },
      };
    } else if (qualityFilter === 'good') {
      where.translations = {
        some: {
          language: { in: enabledLanguages },
          qualityScore: {
            AND: [{ score: { gte: 60 } }, { score: { lt: 80 } }],
          },
        },
      };
    } else if (qualityFilter === 'needsReview') {
      where.translations = {
        some: {
          language: { in: enabledLanguages },
          qualityScore: { score: { lt: 60 } },
        },
      };
    }

    const [keys, total] = await Promise.all([
      this.prisma.translationKey.findMany({
        where,
        include: {
          translations: {
            include: { qualityScore: true },
            orderBy: { language: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.translationKey.count({ where }),
    ]);

    return {
      keys: keys as KeyWithTranslations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Update translation key
   * @throws NotFoundError if key doesn't exist
   * @throws FieldValidationError if new name/namespace combination already exists
   */
  async updateKey(id: string, input: UpdateKeyInput): Promise<KeyWithTranslations> {
    const existing = await this.prisma.translationKey.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Translation key');
    }

    const newName = input.name ?? existing.name;
    const newNamespace =
      input.namespace !== undefined ? (input.namespace ?? null) : existing.namespace;

    // Check for conflicts if name or namespace is changing
    if (newName !== existing.name || newNamespace !== existing.namespace) {
      const conflict = await this.prisma.translationKey.findFirst({
        where: {
          branchId: existing.branchId,
          namespace: newNamespace,
          name: newName,
        },
      });

      if (conflict && conflict.id !== id) {
        throw new FieldValidationError(
          [
            {
              field: 'name',
              message: 'A key with this name already exists in this branch/namespace',
              code: UNIQUE_VIOLATION_CODES.TRANSLATION_KEY,
            },
          ],
          'Key with this name already exists'
        );
      }
    }

    const key = await this.prisma.translationKey.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.namespace !== undefined && { namespace: input.namespace ?? null }),
        ...(input.description !== undefined && { description: input.description }),
      },
      include: {
        translations: {
          include: { qualityScore: true },
        },
      },
    });

    return key as KeyWithTranslations;
  }

  /**
   * Delete translation key
   * @throws NotFoundError if key doesn't exist
   */
  async deleteKey(id: string): Promise<KeyWithTranslations> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id },
      include: {
        translations: {
          include: { qualityScore: true },
        },
      },
    });

    if (!key) {
      throw new NotFoundError('Translation key');
    }

    await this.prisma.translationKey.delete({
      where: { id },
    });

    return key as KeyWithTranslations;
  }

  /**
   * Bulk delete translation keys (all-or-nothing)
   * @returns Deleted keys for event emission
   * @throws NotFoundError if some keys don't exist or don't belong to branch
   */
  async bulkDeleteKeys(
    branchId: string,
    keyIds: string[]
  ): Promise<{ count: number; keys: KeyWithTranslations[] }> {
    return this.prisma.$transaction(async (tx) => {
      const keys = await tx.translationKey.findMany({
        where: { id: { in: keyIds }, branchId },
        include: {
          translations: {
            include: { qualityScore: true },
          },
        },
      });

      if (keys.length !== keyIds.length) {
        throw new NotFoundError('Some translation keys not found in this branch');
      }

      const result = await tx.translationKey.deleteMany({
        where: { id: { in: keyIds } },
      });

      return { count: result.count, keys: keys as KeyWithTranslations[] };
    });
  }

  // ============================================
  // Translation Operations
  // ============================================

  /**
   * Set translation for a key in a specific language
   * Auto-resets approval status to PENDING when value changes
   * @throws NotFoundError if key doesn't exist
   */
  async setTranslation(keyId: string, language: string, value: string): Promise<Translation> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundError('Translation key');
    }

    const existing = await this.prisma.translation.findUnique({
      where: { keyId_language: { keyId, language } },
    });

    const valueChanged = existing && existing.value !== value;

    return this.prisma.translation.upsert({
      where: { keyId_language: { keyId, language } },
      update: {
        value,
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
   * Update all translations for a key at once
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

    const existingMap = new Map(key.translations.map((t) => [t.language, t.value]));

    for (const [language, value] of Object.entries(translations)) {
      const existingValue = existingMap.get(language);
      const valueChanged = existingValue !== undefined && existingValue !== value;

      await this.prisma.translation.upsert({
        where: { keyId_language: { keyId, language } },
        update: {
          value,
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

    const result = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
      include: {
        translations: {
          include: { qualityScore: true },
        },
      },
    });

    return result as KeyWithTranslations;
  }

  /**
   * Get all translations for a branch in bulk format (for CLI pull)
   */
  async getBranchTranslations(branchId: string): Promise<BranchTranslations> {
    const keys = await this.prisma.translationKey.findMany({
      where: { branchId },
      include: { translations: true },
    });

    const translations: Record<string, Record<string, string>> = {};

    for (const key of keys) {
      const combinedKey = combineKey(key.namespace, key.name);
      for (const trans of key.translations) {
        if (!translations[trans.language]) {
          translations[trans.language] = {};
        }
        translations[trans.language][combinedKey] = trans.value;
      }
    }

    const languages = Object.keys(translations);
    return { translations, languages };
  }

  /**
   * Bulk update translations for a branch (for CLI push, all-or-nothing)
   */
  async bulkUpdateTranslations(
    branchId: string,
    translations: Record<string, Record<string, string>>
  ): Promise<BulkUpdateResult> {
    let updated = 0;
    let created = 0;

    await this.prisma.$transaction(
      async (tx) => {
        for (const [language, keyValues] of Object.entries(translations)) {
          for (const [combinedKey, value] of Object.entries(keyValues)) {
            const { namespace, key: keyName } = parseNamespacedKey(combinedKey);

            let key = await tx.translationKey.findFirst({
              where: { branchId, namespace, name: keyName },
            });

            if (!key) {
              key = await tx.translationKey.create({
                data: { branchId, namespace, name: keyName },
              });
              created++;
            }

            const existing = await tx.translation.findUnique({
              where: { keyId_language: { keyId: key.id, language } },
            });

            if (existing) {
              const valueChanged = existing.value !== value;
              await tx.translation.update({
                where: { id: existing.id },
                data: {
                  value,
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
      },
      { timeout: 60000 }
    );

    return { updated, created };
  }

  /**
   * Get list of namespaces with key counts for a branch
   */
  async getNamespaces(branchId: string): Promise<NamespaceCount[]> {
    const results = await this.prisma.translationKey.groupBy({
      by: ['namespace'],
      where: { branchId },
      _count: true,
    });

    return results.map((r) => ({
      namespace: r.namespace,
      count: r._count,
    }));
  }

  // ============================================
  // Approval Operations
  // ============================================

  /**
   * Find translation by ID
   */
  async findTranslationById(id: string): Promise<Translation | null> {
    return this.prisma.translation.findUnique({
      where: { id },
    });
  }

  /**
   * Set approval status for a single translation
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
   * Batch set approval status (all-or-nothing)
   */
  async batchSetApprovalStatus(
    translationIds: string[],
    status: 'APPROVED' | 'REJECTED',
    userId: string
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      // Verify all translations exist
      const translations = await tx.translation.findMany({
        where: { id: { in: translationIds } },
      });

      if (translations.length !== translationIds.length) {
        throw new NotFoundError('Some translations not found');
      }

      const result = await tx.translation.updateMany({
        where: { id: { in: translationIds } },
        data: {
          status: status as ApprovalStatus,
          statusUpdatedAt: new Date(),
          statusUpdatedBy: userId,
        },
      });

      return result.count;
    });
  }

  /**
   * Verify all translation IDs belong to the same project
   */
  async verifyTranslationsBelongToSameProject(translationIds: string[]): Promise<string | null> {
    const translations = await this.prisma.translation.findMany({
      where: { id: { in: translationIds } },
      select: {
        key: {
          select: {
            branch: {
              select: {
                space: { select: { projectId: true } },
              },
            },
          },
        },
      },
    });

    if (translations.length !== translationIds.length) {
      return null;
    }

    const projectIds = new Set(translations.map((t) => t.key.branch.space.projectId));
    if (projectIds.size !== 1) {
      return null;
    }

    return [...projectIds][0];
  }

  // ============================================
  // Utility Operations
  // ============================================

  /**
   * Get project ID by key ID (for authorization)
   */
  async getProjectIdByKeyId(keyId: string): Promise<string | null> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
      select: {
        branch: {
          select: {
            space: { select: { projectId: true } },
          },
        },
      },
    });
    return key?.branch?.space?.projectId || null;
  }

  /**
   * Get project ID by translation ID (for authorization)
   */
  async getProjectIdByTranslationId(translationId: string): Promise<string | null> {
    const translation = await this.prisma.translation.findUnique({
      where: { id: translationId },
      select: {
        key: {
          select: {
            branch: {
              select: {
                space: { select: { projectId: true } },
              },
            },
          },
        },
      },
    });
    return translation?.key?.branch?.space?.projectId || null;
  }

  /**
   * Get keys by IDs with translations (for bulk translate)
   */
  async getKeysWithTranslations(
    branchId: string,
    keyIds: string[]
  ): Promise<KeyWithTranslations[]> {
    const keys = await this.prisma.translationKey.findMany({
      where: { id: { in: keyIds }, branchId },
      include: {
        translations: {
          include: { qualityScore: true },
        },
      },
    });
    return keys as KeyWithTranslations[];
  }

  /**
   * Get keys by IDs with translations (without branchId constraint).
   * Returns keys with branchId for event emission.
   */
  async getKeysByIds(keyIds: string[]): Promise<(KeyWithTranslations & { branchId: string })[]> {
    const keys = await this.prisma.translationKey.findMany({
      where: { id: { in: keyIds } },
      include: {
        translations: {
          include: { qualityScore: true },
        },
      },
    });
    return keys as (KeyWithTranslations & { branchId: string })[];
  }

  /**
   * Get all keys for a branch with translations (for pre-translate).
   */
  async getKeysByBranchId(branchId: string): Promise<KeyWithTranslations[]> {
    const keys = await this.prisma.translationKey.findMany({
      where: { branchId },
      include: {
        translations: {
          include: { qualityScore: true },
        },
      },
    });
    return keys as KeyWithTranslations[];
  }

  /**
   * Get project default language by project ID.
   */
  async getProjectSourceLanguage(projectId: string): Promise<string | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { defaultLanguage: true },
    });
    return project?.defaultLanguage ?? null;
  }

  // ============================================
  // Quality Batch Operations
  // ============================================

  /**
   * Find translations for quality batch evaluation with project source language
   */
  async findTranslationsForQualityBatch(translationIds: string[]): Promise<QualityBatchResult> {
    const translations = await this.prisma.translation.findMany({
      where: { id: { in: translationIds } },
      select: {
        id: true,
        keyId: true,
        language: true,
        value: true,
        key: {
          select: {
            name: true,
            branch: {
              select: {
                space: {
                  select: {
                    project: {
                      select: { defaultLanguage: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (translations.length === 0) {
      return { translations: [], sourceLanguage: 'en' };
    }

    const sourceLanguage = translations[0].key.branch.space.project.defaultLanguage || 'en';

    return {
      translations: translations.map((t) => ({
        id: t.id,
        keyId: t.keyId,
        language: t.language,
        value: t.value,
        key: { name: t.key.name },
      })),
      sourceLanguage,
    };
  }

  /**
   * Find source translations for given keys
   * @returns Map of keyId to source translation value
   */
  async findSourceTranslations(
    keyIds: string[],
    sourceLanguage: string
  ): Promise<Map<string, string>> {
    const sourceTranslations = await this.prisma.translation.findMany({
      where: {
        keyId: { in: keyIds },
        language: sourceLanguage,
      },
      select: { keyId: true, value: true },
    });

    return new Map(sourceTranslations.map((s) => [s.keyId, s.value]));
  }

  // ============================================
  // MT Cache Operations
  // ============================================

  /**
   * Clean up expired machine translation cache entries for a project
   * @returns Number of deleted cache entries
   */
  async cleanupExpiredMTCache(projectId: string): Promise<number> {
    const result = await this.prisma.machineTranslationCache.deleteMany({
      where: {
        projectId,
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
