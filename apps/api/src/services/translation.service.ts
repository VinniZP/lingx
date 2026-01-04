/**
 * Translation Service
 *
 * Handles translation key and value CRUD operations.
 * Per Design Doc: AC-WEB-007 through AC-WEB-011
 */
import {
  UNIQUE_VIOLATION_CODES,
  combineKey,
  parseNamespacedKey,
  runBatchQualityChecks,
  runQualityChecks,
  type BatchQualityResult,
  type QualityIssue,
} from '@lingx/shared';
import { ApprovalStatus, PrismaClient, Translation, TranslationKey } from '@prisma/client';
import { FieldValidationError, NotFoundError } from '../plugins/error-handler.js';

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
   * @throws FieldValidationError if key name already exists in branch+namespace
   */
  async createKey(input: CreateKeyInput): Promise<KeyWithTranslations> {
    const namespace = input.namespace ?? null;

    // Check for duplicate key name in branch+namespace
    // Use findFirst because namespace can be null
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
          include: {
            qualityScore: true,
          },
          orderBy: { language: 'asc' },
        },
      },
    });
  }

  /**
   * Find keys by branch ID with pagination, search, and status filter
   *
   * @param branchId - Branch ID
   * @param options - Pagination, search, namespace, and status filter options
   * @returns Paginated list of keys with translations
   */
  async findKeysByBranchId(
    branchId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      filter?: 'all' | 'missing' | 'complete' | 'pending' | 'approved' | 'rejected' | 'warnings';
      qualityFilter?: 'all' | 'excellent' | 'good' | 'needsReview' | 'unscored';
      namespace?: string; // Use "__root__" for keys without namespace
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

    // For 'warnings' filter, we need to check quality issues
    if (options.filter === 'warnings') {
      const sourceLanguage = branch?.space.project.languages[0]?.code || 'en'; // First language as source
      return this.findKeysByQualityFilter(branchId, options, sourceLanguage);
    }

    // For quality score filters, use dedicated method
    if (options.qualityFilter && options.qualityFilter !== 'all') {
      const enabledLanguages = branch?.space.project.languages.map((l) => l.code) || [];
      return this.findKeysByQualityScoreFilter(branchId, options, enabledLanguages);
    }

    // Build the where clause for other filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { branchId };

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

    // Filter by approval status - keys that have at least one translation with this status
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
          value: { not: '' }, // Only consider translations with actual values
        },
      };
    }

    const [keys, total] = await Promise.all([
      this.prisma.translationKey.findMany({
        where,
        include: {
          translations: {
            include: {
              qualityScore: true,
            },
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
      filter?: 'all' | 'missing' | 'complete' | 'pending' | 'approved' | 'rejected' | 'warnings';
      namespace?: string;
    },
    languageCount: number
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    // For 'missing': keys where translation count < language count
    // For 'complete': keys where non-empty translation count >= language count
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
                include: {
                  qualityScore: true,
                },
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
   * Find keys by quality issues filter (warnings)
   * Fetches keys and filters by quality check failures
   */
  private async findKeysByQualityFilter(
    branchId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      namespace?: string;
    },
    sourceLanguage: string
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;

    // Build base where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { branchId };

    if (options.namespace !== undefined) {
      where.namespace = options.namespace === '__root__' ? null : options.namespace;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Fetch all matching keys with translations
    const allKeys = await this.prisma.translationKey.findMany({
      where,
      include: {
        translations: {
          include: {
            qualityScore: true,
          },
          orderBy: { language: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Filter to keys with quality issues
    const keysWithIssues = allKeys.filter((key) => {
      const sourceText = key.translations.find((t) => t.language === sourceLanguage)?.value;
      if (!sourceText) return false;

      for (const translation of key.translations) {
        if (translation.language === sourceLanguage) continue;
        if (!translation.value) continue;

        const result = runQualityChecks({
          source: sourceText,
          target: translation.value,
          sourceLanguage,
          targetLanguage: translation.language,
        });

        if (result.issues.length > 0) return true;
      }
      return false;
    });

    // Paginate
    const total = keysWithIssues.length;
    const paginatedKeys = keysWithIssues.slice((page - 1) * limit, page * limit);

    return {
      keys: paginatedKeys,
      total,
      page,
      limit,
    };
  }

  /**
   * Find keys by quality score filter (excellent, good, needsReview, unscored)
   * Filters based on TranslationQualityScore records
   */
  private async findKeysByQualityScoreFilter(
    branchId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      filter?: 'all' | 'missing' | 'complete' | 'pending' | 'approved' | 'rejected' | 'warnings';
      qualityFilter?: 'all' | 'excellent' | 'good' | 'needsReview' | 'unscored';
      namespace?: string;
    },
    enabledLanguages: string[]
  ): Promise<KeyListResult> {
    const page = options.page || 1;
    const limit = options.limit || 50;

    // Build base where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { branchId };

    if (options.namespace !== undefined) {
      where.namespace = options.namespace === '__root__' ? null : options.namespace;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Build quality score filter conditions - only check enabled languages
    const qualityFilter = options.qualityFilter;
    if (qualityFilter === 'unscored') {
      // Keys where at least one enabled language translation has no quality score
      where.translations = {
        some: {
          language: { in: enabledLanguages },
          value: { not: '' },
          qualityScore: null,
        },
      };
    } else if (qualityFilter === 'excellent') {
      // Keys where at least one enabled language translation has score >= 80
      where.translations = {
        some: {
          language: { in: enabledLanguages },
          qualityScore: {
            score: { gte: 80 },
          },
        },
      };
    } else if (qualityFilter === 'good') {
      // Keys where at least one enabled language translation has score 60-79
      where.translations = {
        some: {
          language: { in: enabledLanguages },
          qualityScore: {
            AND: [{ score: { gte: 60 } }, { score: { lt: 80 } }],
          },
        },
      };
    } else if (qualityFilter === 'needsReview') {
      // Keys where at least one enabled language translation has score < 60
      where.translations = {
        some: {
          language: { in: enabledLanguages },
          qualityScore: {
            score: { lt: 60 },
          },
        },
      };
    }

    const [keys, total] = await Promise.all([
      this.prisma.translationKey.findMany({
        where,
        include: {
          translations: {
            include: {
              qualityScore: true,
            },
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
   * @throws FieldValidationError if new name/namespace combination already exists
   */
  async updateKey(id: string, input: UpdateKeyInput): Promise<KeyWithTranslations> {
    const existing = await this.prisma.translationKey.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Translation key');
    }

    // Determine final name and namespace
    const newName = input.name ?? existing.name;
    const newNamespace =
      input.namespace !== undefined ? (input.namespace ?? null) : existing.namespace;

    // If name or namespace is changing, check for conflicts
    if (newName !== existing.name || newNamespace !== existing.namespace) {
      // Use findFirst because namespace can be null
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

    return this.prisma.translationKey.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.namespace !== undefined && { namespace: input.namespace ?? null }),
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
  async setTranslation(keyId: string, language: string, value: string): Promise<Translation> {
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
    const existingMap = new Map(key.translations.map((t) => [t.language, t.value]));

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
   * Keys are returned in delimiter format: namespace␟key for namespaced keys
   *
   * @param branchId - Branch ID
   * @returns Translations grouped by language then combined key
   */
  async getBranchTranslations(branchId: string): Promise<BranchTranslations> {
    const keys = await this.prisma.translationKey.findMany({
      where: { branchId },
      include: { translations: true },
    });

    // Transform to { language: { combinedKey: value } } format
    // combinedKey uses delimiter format: namespace␟key or just key for root
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

    // Extract unique languages
    const languages = Object.keys(translations);

    return { translations, languages };
  }

  /**
   * Get list of namespaces with key counts for a branch
   *
   * @param branchId - Branch ID
   * @returns Array of namespaces with counts
   */
  async getNamespaces(
    branchId: string
  ): Promise<Array<{ namespace: string | null; count: number }>> {
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

  /**
   * Bulk update translations for a branch
   * Used for CLI push operations
   * Keys can be in delimiter format: namespace␟key for namespaced keys
   * Auto-resets approval status to PENDING when value changes
   *
   * @param branchId - Branch ID
   * @param translations - Translations grouped by language then combined key
   * @returns Count of updated and created translations
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
            // Parse namespace and key from combined format
            const { namespace, key: keyName } = parseNamespacedKey(combinedKey);

            // Find or create key
            // Use findFirst because namespace can be null
            let key = await tx.translationKey.findFirst({
              where: {
                branchId,
                namespace,
                name: keyName,
              },
            });

            if (!key) {
              key = await tx.translationKey.create({
                data: { branchId, namespace, name: keyName },
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
      },
      {
        timeout: 60000, // 60 seconds for large bulk operations
      }
    );

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
  async verifyTranslationsBelongToSameProject(translationIds: string[]): Promise<string | null> {
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

    const projectIds = new Set(translations.map((t) => t.key.branch.space.projectId));

    if (projectIds.size !== 1) {
      return null; // Translations belong to different projects
    }

    return [...projectIds][0];
  }

  // ============================================
  // QUALITY CHECKS
  // ============================================

  /**
   * Set translation with quality check
   *
   * @param keyId - Key ID
   * @param language - Language code
   * @param value - Translation value
   * @param sourceLanguage - Source language code for comparison
   * @returns Translation with quality issues (if any)
   */
  async setTranslationWithQuality(
    keyId: string,
    language: string,
    value: string,
    sourceLanguage: string
  ): Promise<{ translation: Translation; qualityIssues: QualityIssue[] }> {
    // Get key with translations to find source text
    const key = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
      include: { translations: true },
    });

    if (!key) {
      throw new NotFoundError('Translation key');
    }

    // Run quality checks if this is not the source language
    let qualityIssues: QualityIssue[] = [];
    if (language !== sourceLanguage && value.trim()) {
      const sourceTranslation = key.translations.find((t) => t.language === sourceLanguage);
      const sourceText = sourceTranslation?.value || '';

      if (sourceText.trim()) {
        const result = runQualityChecks({
          source: sourceText,
          target: value,
          sourceLanguage,
          targetLanguage: language,
        });
        qualityIssues = result.issues;
      }
    }

    // Save the translation (quality issues are warnings, not blocking)
    const translation = await this.setTranslation(keyId, language, value);

    return { translation, qualityIssues };
  }

  /**
   * Run quality checks on all translations in a branch
   *
   * @param branchId - Branch ID
   * @param sourceLanguage - Source language code
   * @param keyIds - Optional array of specific key IDs to check
   * @returns Quality check results
   */
  async checkBranchQuality(
    branchId: string,
    sourceLanguage: string,
    keyIds?: string[]
  ): Promise<{
    totalKeys: number;
    keysWithIssues: number;
    results: BatchQualityResult[];
  }> {
    // Get keys with translations
    const keys = await this.prisma.translationKey.findMany({
      where: {
        branchId,
        ...(keyIds?.length ? { id: { in: keyIds } } : {}),
      },
      include: { translations: true },
    });

    // Build batch input
    const batchInput = keys.map((key) => {
      const sourceTranslation = key.translations.find((t) => t.language === sourceLanguage);
      return {
        keyName: key.name,
        keyId: key.id,
        sourceText: sourceTranslation?.value || '',
        translations: Object.fromEntries(key.translations.map((t) => [t.language, t.value])),
      };
    });

    // Run batch quality checks
    const results = runBatchQualityChecks(batchInput, sourceLanguage);

    // Count unique keys with issues
    const keysWithIssues = new Set(results.map((r) => r.keyId)).size;

    return {
      totalKeys: keys.length,
      keysWithIssues,
      results,
    };
  }
}
