/**
 * Quality Glossary Repository
 *
 * Data access layer for glossary terms used in quality evaluation.
 * Note: Named differently from modules/glossary/repositories/glossary.repository.ts
 * which handles full glossary CRUD. This repository is specifically for
 * fetching terms needed by the GlossaryEvaluator.
 */

import type { GlossaryEntry, GlossaryTranslation, PrismaClient } from '@prisma/client';

// ============================================
// Types
// ============================================

/**
 * Glossary entry with translations for a specific locale
 */
export interface GlossaryEntryWithTranslations extends GlossaryEntry {
  translations: GlossaryTranslation[];
}

// ============================================
// Repository
// ============================================

/**
 * Repository for glossary data access in quality evaluation.
 *
 * Used by GlossaryEvaluator to fetch glossary terms
 * for quality validation.
 */
export class QualityGlossaryRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find glossary terms for a project with translations for a specific locale.
   *
   * @param projectId - Project ID
   * @param targetLocale - Target language code to filter translations
   * @returns Glossary entries with their translations for the target locale
   */
  async findTermsWithTranslations(
    projectId: string,
    targetLocale: string
  ): Promise<GlossaryEntryWithTranslations[]> {
    return this.prisma.glossaryEntry.findMany({
      where: { projectId },
      include: {
        translations: {
          where: { targetLanguage: targetLocale },
        },
      },
    });
  }
}
