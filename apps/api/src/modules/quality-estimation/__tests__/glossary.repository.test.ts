import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QualityGlossaryRepository } from '../repositories/glossary.repository.js';

describe('QualityGlossaryRepository', () => {
  const mockPrisma = {
    glossaryEntry: {
      findMany: vi.fn(),
    },
  };

  const createRepository = () =>
    new QualityGlossaryRepository(mockPrisma as unknown as PrismaClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findTermsWithTranslations', () => {
    it('should find glossary terms with translations for target locale', async () => {
      const repository = createRepository();

      const mockTerms = [
        {
          id: 'term-1',
          projectId: 'project-1',
          sourceTerm: 'Save',
          translations: [
            {
              id: 'trans-1',
              targetLanguage: 'de',
              targetTerm: 'Speichern',
            },
          ],
        },
        {
          id: 'term-2',
          projectId: 'project-1',
          sourceTerm: 'Cancel',
          translations: [
            {
              id: 'trans-2',
              targetLanguage: 'de',
              targetTerm: 'Abbrechen',
            },
          ],
        },
      ];

      mockPrisma.glossaryEntry.findMany.mockResolvedValue(mockTerms);

      const result = await repository.findTermsWithTranslations('project-1', 'de');

      expect(mockPrisma.glossaryEntry.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        include: {
          translations: {
            where: { targetLanguage: 'de' },
          },
        },
      });
      expect(result).toEqual(mockTerms);
    });

    it('should return empty array when no terms exist', async () => {
      const repository = createRepository();

      mockPrisma.glossaryEntry.findMany.mockResolvedValue([]);

      const result = await repository.findTermsWithTranslations('project-1', 'fr');

      expect(result).toEqual([]);
    });

    it('should filter translations by target locale only', async () => {
      const repository = createRepository();

      const mockTerms = [
        {
          id: 'term-1',
          projectId: 'project-1',
          sourceTerm: 'File',
          translations: [], // No translations for requested locale
        },
      ];

      mockPrisma.glossaryEntry.findMany.mockResolvedValue(mockTerms);

      const result = await repository.findTermsWithTranslations('project-1', 'ja');

      expect(mockPrisma.glossaryEntry.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        include: {
          translations: {
            where: { targetLanguage: 'ja' },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].translations).toHaveLength(0);
    });
  });
});
