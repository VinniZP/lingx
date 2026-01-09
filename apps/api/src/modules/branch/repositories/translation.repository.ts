/**
 * Translation Repository
 *
 * Data access layer for translation operations.
 * Currently in branch module, may move to dedicated translation module later.
 */
import type { Prisma, PrismaClient } from '@prisma/client';

export class TranslationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Upsert a translation for a key
   */
  async upsert(
    keyId: string,
    language: string,
    value: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.translation.upsert({
      where: { keyId_language: { keyId, language } },
      update: { value },
      create: { keyId, language, value },
    });
  }

  /**
   * Create multiple translations for a key
   */
  async createMany(
    keyId: string,
    translations: Record<string, string>,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const data = Object.entries(translations).map(([language, value]) => ({
      keyId,
      language,
      value,
    }));

    if (data.length > 0) {
      await client.translation.createMany({ data });
    }
  }
}
