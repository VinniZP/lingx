/**
 * Translation Key Repository
 *
 * Data access layer for translation key operations.
 * Currently in branch module, may move to dedicated translation module later.
 */
import type { Prisma, PrismaClient } from '@prisma/client';

export interface KeyWithTranslations {
  id: string;
  name: string;
  translations: Array<{ language: string; value: string }>;
}

export class TranslationKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find all keys with translations for a branch (used by DiffCalculator)
   */
  async findByBranchId(branchId: string): Promise<KeyWithTranslations[]> {
    return this.prisma.translationKey.findMany({
      where: { branchId },
      select: {
        id: true,
        name: true,
        translations: {
          select: {
            language: true,
            value: true,
          },
        },
      },
    });
  }

  /**
   * Find a key by branch ID and name
   */
  async findByBranchIdAndName(
    branchId: string,
    name: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string } | null> {
    const client = tx ?? this.prisma;
    return client.translationKey.findFirst({
      where: { branchId, name },
      select: { id: true },
    });
  }

  /**
   * Create a new translation key
   */
  async create(
    branchId: string,
    name: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string }> {
    const client = tx ?? this.prisma;
    return client.translationKey.create({
      data: { branchId, name },
      select: { id: true },
    });
  }
}
