/**
 * Glossary Repository
 *
 * Data access layer for glossary/termbase operations.
 * Handles database queries and import/export parsing.
 */

import type {
  CreateGlossaryEntryInput,
  GlossaryListQuery,
  UpdateGlossaryEntryInput,
} from '@lingx/shared';
import { MTProvider, PartOfSpeech, Prisma, type PrismaClient } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface GlossaryMatch {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  context: string | null;
  notes: string | null;
  partOfSpeech: PartOfSpeech | null;
  caseSensitive: boolean;
  domain: string | null;
  matchType: 'exact' | 'partial';
  usageCount: number;
}

/**
 * Options for searching glossary terms within text.
 * Note: Case sensitivity is determined by each entry's individual `caseSensitive` field.
 */
export interface GlossarySearchOptions {
  projectId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  limit?: number;
}

export interface GlossaryEntryWithRelations {
  id: string;
  projectId: string;
  sourceTerm: string;
  sourceLanguage: string;
  context: string | null;
  notes: string | null;
  partOfSpeech: PartOfSpeech | null;
  caseSensitive: boolean;
  domain: string | null;
  usageCount: number;
  lastUsedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  translations: Array<{
    id: string;
    targetLanguage: string;
    targetTerm: string;
    notes: string | null;
  }>;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
}

export interface GlossaryStats {
  totalEntries: number;
  totalTranslations: number;
  languagePairs: Array<{
    sourceLanguage: string;
    targetLanguage: string;
    count: number;
  }>;
  topDomains: Array<{
    domain: string;
    count: number;
  }>;
  topTags: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface GlossaryTag {
  id: string;
  name: string;
  color: string | null;
}

export interface GlossaryTagWithCount extends GlossaryTag {
  entryCount: number;
}

export interface ExportOptions {
  sourceLanguage?: string;
  targetLanguages?: string[];
  tagIds?: string[];
  domain?: string;
}

export interface ProviderSyncEntry {
  source: string;
  target: string;
}

export interface GlossarySyncStatus {
  provider: MTProvider;
  sourceLanguage: string;
  targetLanguage: string;
  externalGlossaryId: string | null;
  entriesCount: number;
  lastSyncedAt: Date;
  syncStatus: 'synced' | 'pending' | 'error';
  syncError: string | null;
}

interface GlossaryMatchRow {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  context: string | null;
  notes: string | null;
  partOfSpeech: PartOfSpeech | null;
  caseSensitive: boolean;
  domain: string | null;
  usageCount: number;
}

// ============================================
// REPOSITORY
// ============================================

export class GlossaryRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // SEARCH
  // ============================================

  /**
   * Search for glossary terms that appear within the source text.
   * Uses PostgreSQL word boundary regex for intelligent matching.
   */
  async searchInText(options: GlossarySearchOptions): Promise<GlossaryMatch[]> {
    const limit = options.limit ?? 20;

    if (options.sourceText.length < 2) {
      return [];
    }

    const results = await this.prisma.$queryRaw<GlossaryMatchRow[]>`
      SELECT
        ge.id,
        ge."sourceTerm",
        gt."targetTerm",
        ge.context,
        ge.notes,
        ge."partOfSpeech",
        ge."caseSensitive",
        ge.domain,
        ge."usageCount"
      FROM "GlossaryEntry" ge
      JOIN "GlossaryTranslation" gt ON gt."entryId" = ge.id
      WHERE ge."projectId" = ${options.projectId}
        AND ge."sourceLanguage" = ${options.sourceLanguage}
        AND gt."targetLanguage" = ${options.targetLanguage}
        AND (
          (ge."caseSensitive" = true
            AND ${options.sourceText} ~ ('\\m' || regexp_replace(ge."sourceTerm", '([.+*?^|()[\\]\\\\])', '\\\\\\1', 'g') || '\\M'))
          OR
          (ge."caseSensitive" = false
            AND ${options.sourceText} ~* ('\\m' || regexp_replace(ge."sourceTerm", '([.+*?^|()[\\]\\\\])', '\\\\\\1', 'g') || '\\M'))
        )
      ORDER BY
        LENGTH(ge."sourceTerm") DESC,
        ge."usageCount" DESC
      LIMIT ${limit}
    `;

    return results.map((row) => {
      const isExact = row.caseSensitive
        ? options.sourceText === row.sourceTerm
        : options.sourceText.toLowerCase() === row.sourceTerm.toLowerCase();

      return {
        id: row.id,
        sourceTerm: row.sourceTerm,
        targetTerm: row.targetTerm,
        context: row.context,
        notes: row.notes,
        partOfSpeech: row.partOfSpeech,
        caseSensitive: row.caseSensitive,
        domain: row.domain,
        matchType: isExact ? 'exact' : 'partial',
        usageCount: row.usageCount,
      };
    });
  }

  // ============================================
  // ENTRY CRUD
  // ============================================

  /**
   * Create a new glossary entry with translations and tags.
   */
  async createEntry(
    projectId: string,
    input: CreateGlossaryEntryInput,
    userId?: string
  ): Promise<GlossaryEntryWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.glossaryEntry.create({
        data: {
          projectId,
          sourceTerm: input.sourceTerm.trim(),
          sourceLanguage: input.sourceLanguage,
          context: input.context?.trim() || null,
          notes: input.notes?.trim() || null,
          partOfSpeech: input.partOfSpeech || null,
          caseSensitive: input.caseSensitive ?? false,
          domain: input.domain?.trim() || null,
          createdBy: userId || null,
        },
      });

      if (input.translations && input.translations.length > 0) {
        await tx.glossaryTranslation.createMany({
          data: input.translations.map((t) => ({
            entryId: entry.id,
            targetLanguage: t.targetLanguage,
            targetTerm: t.targetTerm.trim(),
            notes: t.notes?.trim() || null,
          })),
        });
      }

      if (input.tagIds && input.tagIds.length > 0) {
        await tx.glossaryEntryTag.createMany({
          data: input.tagIds.map((tagId) => ({
            entryId: entry.id,
            tagId,
          })),
        });
      }

      return tx.glossaryEntry.findUniqueOrThrow({
        where: { id: entry.id },
        include: {
          translations: true,
          tags: { include: { tag: true } },
        },
      });
    });
  }

  /**
   * Get an entry by ID with relations.
   */
  async getEntry(entryId: string): Promise<GlossaryEntryWithRelations | null> {
    return this.prisma.glossaryEntry.findUnique({
      where: { id: entryId },
      include: {
        translations: true,
        tags: { include: { tag: true } },
      },
    });
  }

  /**
   * Update a glossary entry.
   */
  async updateEntry(
    entryId: string,
    input: UpdateGlossaryEntryInput
  ): Promise<GlossaryEntryWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.GlossaryEntryUpdateInput = {};

      if (input.sourceTerm !== undefined) {
        updateData.sourceTerm = input.sourceTerm.trim();
      }
      if (input.context !== undefined) {
        updateData.context = input.context?.trim() || null;
      }
      if (input.notes !== undefined) {
        updateData.notes = input.notes?.trim() || null;
      }
      if (input.partOfSpeech !== undefined) {
        updateData.partOfSpeech = input.partOfSpeech;
      }
      if (input.caseSensitive !== undefined) {
        updateData.caseSensitive = input.caseSensitive;
      }
      if (input.domain !== undefined) {
        updateData.domain = input.domain?.trim() || null;
      }

      await tx.glossaryEntry.update({
        where: { id: entryId },
        data: updateData,
      });

      if (input.tagIds !== undefined) {
        await tx.glossaryEntryTag.deleteMany({ where: { entryId } });
        if (input.tagIds.length > 0) {
          await tx.glossaryEntryTag.createMany({
            data: input.tagIds.map((tagId) => ({ entryId, tagId })),
          });
        }
      }

      return tx.glossaryEntry.findUniqueOrThrow({
        where: { id: entryId },
        include: {
          translations: true,
          tags: { include: { tag: true } },
        },
      });
    });
  }

  /**
   * Delete a glossary entry.
   */
  async deleteEntry(entryId: string): Promise<void> {
    await this.prisma.glossaryEntry.delete({ where: { id: entryId } });
  }

  /**
   * Check if an entry belongs to a project.
   */
  async entryBelongsToProject(entryId: string, projectId: string): Promise<boolean> {
    const entry = await this.prisma.glossaryEntry.findUnique({
      where: { id: entryId },
      select: { projectId: true },
    });
    return entry?.projectId === projectId;
  }

  /**
   * List entries with filtering and pagination.
   */
  async listEntries(
    projectId: string,
    query: GlossaryListQuery
  ): Promise<{
    entries: GlossaryEntryWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.GlossaryEntryWhereInput = { projectId };

    if (query.sourceLanguage) {
      where.sourceLanguage = query.sourceLanguage;
    }
    if (query.partOfSpeech) {
      where.partOfSpeech = query.partOfSpeech;
    }
    if (query.domain) {
      where.domain = query.domain;
    }
    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }
    if (query.search) {
      where.OR = [
        { sourceTerm: { contains: query.search, mode: 'insensitive' } },
        { context: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { translations: { some: { targetTerm: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    if (query.targetLanguage) {
      where.translations = { some: { targetLanguage: query.targetLanguage } };
    }

    const [entries, total] = await Promise.all([
      this.prisma.glossaryEntry.findMany({
        where,
        include: {
          translations: true,
          tags: { include: { tag: true } },
        },
        orderBy: [{ sourceTerm: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.glossaryEntry.count({ where }),
    ]);

    return { entries, total, page, limit };
  }

  // ============================================
  // TRANSLATIONS
  // ============================================

  /**
   * Add or update a translation for an entry.
   */
  async upsertTranslation(
    entryId: string,
    targetLanguage: string,
    targetTerm: string,
    notes?: string | null
  ): Promise<void> {
    await this.prisma.glossaryTranslation.upsert({
      where: { entryId_targetLanguage: { entryId, targetLanguage } },
      update: {
        targetTerm: targetTerm.trim(),
        notes: notes?.trim() || null,
      },
      create: {
        entryId,
        targetLanguage,
        targetTerm: targetTerm.trim(),
        notes: notes?.trim() || null,
      },
    });
  }

  /**
   * Delete a translation from an entry.
   */
  async deleteTranslation(entryId: string, targetLanguage: string): Promise<void> {
    await this.prisma.glossaryTranslation.delete({
      where: { entryId_targetLanguage: { entryId, targetLanguage } },
    });
  }

  // ============================================
  // USAGE TRACKING
  // ============================================

  /**
   * Record usage of a glossary term.
   */
  async recordUsage(entryId: string): Promise<void> {
    await this.prisma.glossaryEntry.update({
      where: { id: entryId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get glossary statistics for a project.
   */
  async getStats(projectId: string): Promise<GlossaryStats> {
    const [totalEntries, totalTranslations, languagePairsRaw, topDomainsRaw, topTagsRaw] =
      await Promise.all([
        this.prisma.glossaryEntry.count({ where: { projectId } }),
        this.prisma.glossaryTranslation.count({ where: { entry: { projectId } } }),
        this.prisma.$queryRaw<
          Array<{ sourceLanguage: string; targetLanguage: string; count: bigint }>
        >`
          SELECT ge."sourceLanguage", gt."targetLanguage", COUNT(*) as count
          FROM "GlossaryEntry" ge
          JOIN "GlossaryTranslation" gt ON gt."entryId" = ge.id
          WHERE ge."projectId" = ${projectId}
          GROUP BY ge."sourceLanguage", gt."targetLanguage"
          ORDER BY count DESC
        `,
        this.prisma.glossaryEntry.groupBy({
          by: ['domain'],
          where: { projectId, domain: { not: null } },
          _count: true,
          orderBy: { _count: { domain: 'desc' } },
          take: 10,
        }),
        this.prisma.$queryRaw<Array<{ id: string; name: string; count: bigint }>>`
          SELECT gt.id, gt.name, COUNT(get."entryId") as count
          FROM "GlossaryTag" gt
          JOIN "GlossaryEntryTag" get ON get."tagId" = gt.id
          JOIN "GlossaryEntry" ge ON ge.id = get."entryId"
          WHERE gt."projectId" = ${projectId}
          GROUP BY gt.id, gt.name
          ORDER BY count DESC
          LIMIT 10
        `,
      ]);

    return {
      totalEntries,
      totalTranslations,
      languagePairs: languagePairsRaw.map((lp) => ({
        sourceLanguage: lp.sourceLanguage,
        targetLanguage: lp.targetLanguage,
        count: Number(lp.count),
      })),
      topDomains: topDomainsRaw
        .filter((d) => d.domain !== null)
        .map((d) => ({ domain: d.domain!, count: d._count })),
      topTags: topTagsRaw.map((t) => ({
        id: t.id,
        name: t.name,
        count: Number(t.count),
      })),
    };
  }

  // ============================================
  // TAGS
  // ============================================

  /**
   * Create a new tag.
   */
  async createTag(projectId: string, name: string, color?: string): Promise<GlossaryTag> {
    return this.prisma.glossaryTag.create({
      data: { projectId, name: name.trim(), color: color || null },
    });
  }

  /**
   * Update a tag.
   */
  async updateTag(tagId: string, name?: string, color?: string | null): Promise<GlossaryTag> {
    const data: Prisma.GlossaryTagUpdateInput = {};
    if (name !== undefined) data.name = name.trim();
    if (color !== undefined) data.color = color;
    return this.prisma.glossaryTag.update({ where: { id: tagId }, data });
  }

  /**
   * Delete a tag.
   */
  async deleteTag(tagId: string): Promise<void> {
    await this.prisma.glossaryTag.delete({ where: { id: tagId } });
  }

  /**
   * List all tags for a project with entry counts.
   */
  async listTags(projectId: string): Promise<GlossaryTagWithCount[]> {
    const tags = await this.prisma.glossaryTag.findMany({
      where: { projectId },
      include: { _count: { select: { entries: true } } },
      orderBy: { name: 'asc' },
    });

    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      entryCount: t._count.entries,
    }));
  }

  /**
   * Check if a tag belongs to a project.
   */
  async tagBelongsToProject(tagId: string, projectId: string): Promise<boolean> {
    const tag = await this.prisma.glossaryTag.findUnique({
      where: { id: tagId },
      select: { projectId: true },
    });
    return tag?.projectId === projectId;
  }

  // ============================================
  // IMPORT / EXPORT
  // ============================================

  /**
   * Import glossary entries from CSV.
   *
   * **CSV Format:**
   * - Header row required with column names
   * - Required columns: `source_term`, `source_language`, `target_term`, `target_language`
   * - Optional columns: `context`, `notes`, `part_of_speech`, `domain`, `case_sensitive`, `tags`
   * - Values should be comma-separated, quoted if containing commas
   * - `case_sensitive`: "true", "1", or "yes" for true; otherwise false
   * - `part_of_speech`: NOUN, VERB, ADJECTIVE, ADVERB, PRONOUN, PREPOSITION, CONJUNCTION, INTERJECTION, DETERMINER, OTHER
   * - `tags`: comma-separated tag names (existing tags only)
   *
   * @example
   * ```csv
   * source_term,source_language,target_term,target_language,context,notes
   * Hello,en,Hallo,de,"Greeting","Informal greeting"
   * Goodbye,en,Auf Wiedersehen,de,"Farewell","Formal farewell"
   * ```
   */
  async importFromCSV(
    projectId: string,
    csvContent: string,
    overwrite: boolean,
    userId?: string
  ): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      result.errors.push('CSV file is empty or has no data rows');
      return result;
    }

    const header = this.parseCSVLine(lines[0]);
    const requiredColumns = ['source_term', 'source_language', 'target_term', 'target_language'];
    const missingColumns = requiredColumns.filter((col) => !header.includes(col));
    if (missingColumns.length > 0) {
      result.errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      return result;
    }

    const idx = {
      sourceTerm: header.indexOf('source_term'),
      sourceLanguage: header.indexOf('source_language'),
      targetTerm: header.indexOf('target_term'),
      targetLanguage: header.indexOf('target_language'),
      context: header.indexOf('context'),
      notes: header.indexOf('notes'),
      partOfSpeech: header.indexOf('part_of_speech'),
      domain: header.indexOf('domain'),
      caseSensitive: header.indexOf('case_sensitive'),
      tags: header.indexOf('tags'),
    };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length < 4) {
          result.errors.push(`Row ${i + 1}: Insufficient columns`);
          result.skipped++;
          continue;
        }

        const sourceTerm = values[idx.sourceTerm]?.trim();
        const sourceLanguage = values[idx.sourceLanguage]?.trim();
        const targetTerm = values[idx.targetTerm]?.trim();
        const targetLanguage = values[idx.targetLanguage]?.trim();

        if (!sourceTerm || !sourceLanguage || !targetTerm || !targetLanguage) {
          result.errors.push(`Row ${i + 1}: Missing required values`);
          result.skipped++;
          continue;
        }

        const existing = await this.prisma.glossaryEntry.findUnique({
          where: {
            projectId_sourceLanguage_sourceTerm: { projectId, sourceLanguage, sourceTerm },
          },
        });

        if (existing && !overwrite) {
          result.skipped++;
          continue;
        }

        let partOfSpeech: PartOfSpeech | null = null;
        if (idx.partOfSpeech >= 0 && values[idx.partOfSpeech]) {
          const pos = values[idx.partOfSpeech].trim().toUpperCase();
          const validPos = [
            'NOUN',
            'VERB',
            'ADJECTIVE',
            'ADVERB',
            'PRONOUN',
            'PREPOSITION',
            'CONJUNCTION',
            'INTERJECTION',
            'DETERMINER',
            'OTHER',
          ];
          if (validPos.includes(pos)) {
            partOfSpeech = pos as PartOfSpeech;
          }
        }

        const caseSensitive =
          idx.caseSensitive >= 0 &&
          ['true', '1', 'yes'].includes(values[idx.caseSensitive]?.toLowerCase());

        if (existing) {
          await this.prisma.glossaryEntry.update({
            where: { id: existing.id },
            data: {
              context: idx.context >= 0 ? values[idx.context]?.trim() || null : existing.context,
              notes: idx.notes >= 0 ? values[idx.notes]?.trim() || null : existing.notes,
              partOfSpeech: partOfSpeech ?? existing.partOfSpeech,
              domain: idx.domain >= 0 ? values[idx.domain]?.trim() || null : existing.domain,
              caseSensitive,
            },
          });
          await this.upsertTranslation(existing.id, targetLanguage, targetTerm);
        } else {
          const entry = await this.prisma.glossaryEntry.create({
            data: {
              projectId,
              sourceTerm,
              sourceLanguage,
              context: idx.context >= 0 ? values[idx.context]?.trim() || null : null,
              notes: idx.notes >= 0 ? values[idx.notes]?.trim() || null : null,
              partOfSpeech,
              domain: idx.domain >= 0 ? values[idx.domain]?.trim() || null : null,
              caseSensitive,
              createdBy: userId,
            },
          });
          await this.prisma.glossaryTranslation.create({
            data: { entryId: entry.id, targetLanguage, targetTerm },
          });
        }

        result.imported++;
      } catch (error) {
        result.errors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        result.skipped++;
      }
    }

    return result;
  }

  /**
   * Import glossary entries from TBX (TermBase eXchange).
   *
   * **TBX Format (TBX-Basic v3):**
   * - Supports `<termEntry>` and `<conceptEntry>` elements
   * - Each entry should contain `<langSec>` elements for language sections
   * - Each language section should have `<termSec>` containing `<term>`
   * - Attributes: `xml:lang` for language codes
   *
   * @example
   * ```xml
   * <termEntry>
   *   <langSec xml:lang="en">
   *     <termSec>
   *       <term>Hello</term>
   *     </termSec>
   *   </langSec>
   *   <langSec xml:lang="de">
   *     <termSec>
   *       <term>Hallo</term>
   *     </termSec>
   *   </langSec>
   * </termEntry>
   * ```
   *
   * Note: TBX entries with multiple language sections create entries for each language pair.
   */
  async importFromTBX(
    projectId: string,
    tbxContent: string,
    overwrite: boolean,
    userId?: string
  ): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    try {
      const termEntries = tbxContent.match(/<termEntry[^>]*>[\s\S]*?<\/termEntry>/gi) || [];
      const conceptEntries =
        tbxContent.match(/<conceptEntry[^>]*>[\s\S]*?<\/conceptEntry>/gi) || [];
      const allEntries = [...termEntries, ...conceptEntries];

      for (const entry of allEntries) {
        try {
          const domainMatch = entry.match(
            /<descrip[^>]*type="subjectField"[^>]*>([^<]+)<\/descrip>/i
          );
          const domain = domainMatch ? domainMatch[1].trim() : null;

          const langSets = entry.match(/<langSet[^>]*>[\s\S]*?<\/langSet>/gi) || [];
          const langSecs = entry.match(/<langSec[^>]*>[\s\S]*?<\/langSec>/gi) || [];
          const langSections = [...langSets, ...langSecs];

          let sourceTerm: string | null = null;
          let sourceLanguage: string | null = null;
          const translations: Array<{ lang: string; term: string }> = [];

          for (const langSec of langSections) {
            const langMatch = langSec.match(/xml:lang="([^"]+)"/i);
            const lang = langMatch ? langMatch[1].trim() : null;
            if (!lang) continue;

            const termMatch = langSec.match(/<term>([^<]+)<\/term>/i);
            const term = termMatch ? termMatch[1].trim() : null;
            if (!term) continue;

            if (!sourceTerm) {
              sourceTerm = term;
              sourceLanguage = lang;
            } else {
              translations.push({ lang, term });
            }
          }

          if (!sourceTerm || !sourceLanguage || translations.length === 0) {
            result.skipped++;
            continue;
          }

          const existing = await this.prisma.glossaryEntry.findUnique({
            where: {
              projectId_sourceLanguage_sourceTerm: { projectId, sourceLanguage, sourceTerm },
            },
          });

          if (existing && !overwrite) {
            result.skipped++;
            continue;
          }

          if (existing) {
            await this.prisma.glossaryEntry.update({
              where: { id: existing.id },
              data: { domain },
            });
            for (const t of translations) {
              await this.upsertTranslation(existing.id, t.lang, t.term);
            }
          } else {
            const newEntry = await this.prisma.glossaryEntry.create({
              data: { projectId, sourceTerm, sourceLanguage, domain, createdBy: userId },
            });
            await this.prisma.glossaryTranslation.createMany({
              data: translations.map((t) => ({
                entryId: newEntry.id,
                targetLanguage: t.lang,
                targetTerm: t.term,
              })),
            });
          }

          result.imported++;
        } catch (error) {
          result.errors.push(
            `Concept entry error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          result.skipped++;
        }
      }
    } catch (error) {
      result.errors.push(
        `TBX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return result;
  }

  /**
   * Export glossary entries to CSV.
   */
  async exportToCSV(projectId: string, options: ExportOptions): Promise<string> {
    const where: Prisma.GlossaryEntryWhereInput = { projectId };

    if (options.sourceLanguage) {
      where.sourceLanguage = options.sourceLanguage;
    }
    if (options.domain) {
      where.domain = options.domain;
    }
    if (options.tagIds && options.tagIds.length > 0) {
      where.tags = { some: { tagId: { in: options.tagIds } } };
    }

    const entries = await this.prisma.glossaryEntry.findMany({
      where,
      include: {
        translations: options.targetLanguages?.length
          ? { where: { targetLanguage: { in: options.targetLanguages } } }
          : true,
        tags: { include: { tag: true } },
      },
      orderBy: { sourceTerm: 'asc' },
    });

    const header = [
      'source_term',
      'source_language',
      'target_term',
      'target_language',
      'context',
      'notes',
      'part_of_speech',
      'domain',
      'case_sensitive',
      'tags',
    ];

    const rows: string[] = [header.join(',')];

    for (const entry of entries) {
      for (const translation of entry.translations) {
        const tagNames = entry.tags.map((t) => t.tag.name).join(';');
        const row = [
          this.escapeCSV(entry.sourceTerm),
          entry.sourceLanguage,
          this.escapeCSV(translation.targetTerm),
          translation.targetLanguage,
          this.escapeCSV(entry.context || ''),
          this.escapeCSV(entry.notes || ''),
          entry.partOfSpeech || '',
          this.escapeCSV(entry.domain || ''),
          entry.caseSensitive ? 'true' : 'false',
          this.escapeCSV(tagNames),
        ];
        rows.push(row.join(','));
      }
    }

    return rows.join('\n');
  }

  /**
   * Export glossary entries to TBX.
   */
  async exportToTBX(projectId: string, options: ExportOptions): Promise<string> {
    const where: Prisma.GlossaryEntryWhereInput = { projectId };

    if (options.sourceLanguage) {
      where.sourceLanguage = options.sourceLanguage;
    }
    if (options.domain) {
      where.domain = options.domain;
    }
    if (options.tagIds && options.tagIds.length > 0) {
      where.tags = { some: { tagId: { in: options.tagIds } } };
    }

    const entries = await this.prisma.glossaryEntry.findMany({
      where,
      include: {
        translations: options.targetLanguages?.length
          ? { where: { targetLanguage: { in: options.targetLanguages } } }
          : true,
      },
      orderBy: { sourceTerm: 'asc' },
    });

    const conceptEntries = entries.map((entry, index) => {
      const langSections: string[] = [];

      langSections.push(`
        <langSec xml:lang="${this.escapeXML(entry.sourceLanguage)}">
          <termSec>
            <term>${this.escapeXML(entry.sourceTerm)}</term>
            ${entry.partOfSpeech ? `<termNote type="partOfSpeech">${entry.partOfSpeech.toLowerCase()}</termNote>` : ''}
            ${entry.notes ? `<descrip type="definition">${this.escapeXML(entry.notes)}</descrip>` : ''}
          </termSec>
        </langSec>`);

      for (const translation of entry.translations) {
        langSections.push(`
        <langSec xml:lang="${this.escapeXML(translation.targetLanguage)}">
          <termSec>
            <term>${this.escapeXML(translation.targetTerm)}</term>
            ${translation.notes ? `<note>${this.escapeXML(translation.notes)}</note>` : ''}
          </termSec>
        </langSec>`);
      }

      return `
      <conceptEntry id="entry-${index + 1}">
        ${entry.domain ? `<descrip type="subjectField">${this.escapeXML(entry.domain)}</descrip>` : ''}
        ${entry.context ? `<descrip type="context">${this.escapeXML(entry.context)}</descrip>` : ''}
        ${langSections.join('')}
      </conceptEntry>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<tbx xmlns="urn:iso:std:iso:30042:ed-2" type="TBX-Basic" xml:lang="en">
  <tbxHeader>
    <fileDesc>
      <titleStmt><title>Lingx Glossary Export</title></titleStmt>
      <sourceDesc><p>Exported from Lingx</p></sourceDesc>
    </fileDesc>
  </tbxHeader>
  <text>
    <body>${conceptEntries.join('')}
    </body>
  </text>
</tbx>`;
  }

  // ============================================
  // MT PROVIDER SYNC
  // ============================================

  /**
   * Prepare entries for MT provider sync.
   */
  async prepareForProviderSync(
    projectId: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<ProviderSyncEntry[]> {
    const entries = await this.prisma.glossaryEntry.findMany({
      where: {
        projectId,
        sourceLanguage,
        translations: { some: { targetLanguage } },
      },
      include: {
        translations: { where: { targetLanguage } },
      },
    });

    return entries
      .filter((e) => e.translations.length > 0)
      .map((e) => ({
        source: e.sourceTerm,
        target: e.translations[0].targetTerm,
      }));
  }

  /**
   * Get sync status for all providers.
   */
  async getSyncStatus(projectId: string): Promise<GlossarySyncStatus[]> {
    const syncs = await this.prisma.glossaryProviderSync.findMany({
      where: { projectId },
      orderBy: { lastSyncedAt: 'desc' },
    });

    return syncs.map((s) => ({
      provider: s.provider,
      sourceLanguage: s.sourceLanguage,
      targetLanguage: s.targetLanguage,
      externalGlossaryId: s.externalGlossaryId,
      entriesCount: s.entriesCount,
      lastSyncedAt: s.lastSyncedAt,
      syncStatus: s.syncStatus as 'synced' | 'pending' | 'error',
      syncError: s.syncError,
    }));
  }

  // ============================================
  // HELPERS
  // ============================================

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private escapeXML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
