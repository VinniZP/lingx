import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QualityEstimationRepository } from '../repositories/quality-estimation.repository.js';

describe('QualityEstimationRepository', () => {
  const mockPrisma = {
    translation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    qualityScoringConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    aITranslationConfig: {
      findUnique: vi.fn(),
    },
  };

  const createRepository = () =>
    new QualityEstimationRepository(mockPrisma as unknown as PrismaClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findTranslationWithContext', () => {
    it('should return translation with key, branch, space, and project', async () => {
      const repository = createRepository();

      const mockTranslation = {
        id: 'translation-1',
        keyId: 'key-1',
        language: 'de',
        value: 'Hallo Welt',
        key: {
          id: 'key-1',
          name: 'greeting',
          branch: {
            id: 'branch-1',
            space: {
              id: 'space-1',
              project: {
                id: 'project-1',
                defaultLanguage: 'en',
              },
            },
          },
        },
        qualityScore: null,
      };

      mockPrisma.translation.findUnique.mockResolvedValue(mockTranslation);

      const result = await repository.findTranslationWithContext('translation-1');

      expect(mockPrisma.translation.findUnique).toHaveBeenCalledWith({
        where: { id: 'translation-1' },
        include: {
          key: {
            include: {
              branch: {
                include: {
                  space: {
                    include: { project: true },
                  },
                },
              },
            },
          },
          qualityScore: true,
        },
      });
      expect(result).toEqual(mockTranslation);
    });

    it('should return null when translation not found', async () => {
      const repository = createRepository();

      mockPrisma.translation.findUnique.mockResolvedValue(null);

      const result = await repository.findTranslationWithContext('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findSourceTranslation', () => {
    it('should find source translation by key and language', async () => {
      const repository = createRepository();

      const mockSource = {
        id: 'source-1',
        keyId: 'key-1',
        language: 'en',
        value: 'Hello World',
      };

      mockPrisma.translation.findFirst.mockResolvedValue(mockSource);

      const result = await repository.findSourceTranslation('key-1', 'en');

      expect(mockPrisma.translation.findFirst).toHaveBeenCalledWith({
        where: {
          keyId: 'key-1',
          language: 'en',
        },
      });
      expect(result).toEqual(mockSource);
    });

    it('should return null when source not found', async () => {
      const repository = createRepository();

      mockPrisma.translation.findFirst.mockResolvedValue(null);

      const result = await repository.findSourceTranslation('key-1', 'en');

      expect(result).toBeNull();
    });
  });

  describe('findTranslationsWithQualityScores', () => {
    it('should find all translations for a key with quality scores', async () => {
      const repository = createRepository();

      const mockTranslations = [
        {
          id: 'trans-1',
          keyId: 'key-1',
          language: 'de',
          value: 'Hallo',
          qualityScore: {
            score: 85,
            issues: [],
          },
        },
        {
          id: 'trans-2',
          keyId: 'key-1',
          language: 'fr',
          value: 'Bonjour',
          qualityScore: null,
        },
      ];

      mockPrisma.translation.findMany.mockResolvedValue(mockTranslations);

      const result = await repository.findTranslationsWithQualityScores('key-1');

      expect(mockPrisma.translation.findMany).toHaveBeenCalledWith({
        where: { keyId: 'key-1' },
        include: { qualityScore: true },
      });
      expect(result).toEqual(mockTranslations);
    });
  });

  describe('findQualityConfig', () => {
    it('should find quality config by project ID', async () => {
      const repository = createRepository();

      const mockConfig = {
        projectId: 'project-1',
        scoreAfterAITranslation: true,
        scoreBeforeMerge: false,
        autoApproveThreshold: 80,
        flagThreshold: 60,
        aiEvaluationEnabled: true,
        aiEvaluationProvider: 'ANTHROPIC',
        aiEvaluationModel: 'claude-sonnet-4-20250514',
      };

      mockPrisma.qualityScoringConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await repository.findQualityConfig('project-1');

      expect(mockPrisma.qualityScoringConfig.findUnique).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
      });
      expect(result).toEqual(mockConfig);
    });

    it('should return null when config not found', async () => {
      const repository = createRepository();

      mockPrisma.qualityScoringConfig.findUnique.mockResolvedValue(null);

      const result = await repository.findQualityConfig('project-1');

      expect(result).toBeNull();
    });
  });

  describe('upsertQualityConfig', () => {
    it('should create config when it does not exist', async () => {
      const repository = createRepository();

      const input = {
        aiEvaluationEnabled: true,
        aiEvaluationProvider: 'ANTHROPIC',
      };

      mockPrisma.qualityScoringConfig.upsert.mockResolvedValue({
        projectId: 'project-1',
        ...input,
      });

      await repository.upsertQualityConfig('project-1', input);

      expect(mockPrisma.qualityScoringConfig.upsert).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        update: input,
        create: {
          projectId: 'project-1',
          ...input,
        },
      });
    });
  });

  describe('findAITranslationConfig', () => {
    it('should find AI config by project and provider', async () => {
      const repository = createRepository();

      const mockConfig = {
        projectId: 'project-1',
        provider: 'ANTHROPIC',
        apiKey: 'encrypted-key',
        apiKeyIv: 'iv-hex',
        isActive: true,
      };

      mockPrisma.aITranslationConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await repository.findAITranslationConfig('project-1', 'ANTHROPIC');

      expect(mockPrisma.aITranslationConfig.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_provider: {
            projectId: 'project-1',
            provider: 'ANTHROPIC',
          },
        },
      });
      expect(result).toEqual(mockConfig);
    });

    it('should return null when AI config not found', async () => {
      const repository = createRepository();

      mockPrisma.aITranslationConfig.findUnique.mockResolvedValue(null);

      const result = await repository.findAITranslationConfig('project-1', 'OPENAI');

      expect(result).toBeNull();
    });
  });

  describe('findTranslationsForBatchEvaluation', () => {
    it('should find translations for batch evaluation by branch', async () => {
      const repository = createRepository();

      const mockTranslations = [
        {
          id: 'trans-1',
          keyId: 'key-1',
          language: 'de',
          value: 'Hallo Welt',
          qualityScore: { contentHash: 'hash-1' },
        },
        {
          id: 'trans-2',
          keyId: 'key-1',
          language: 'fr',
          value: 'Bonjour le monde',
          qualityScore: null,
        },
      ];

      mockPrisma.translation.findMany.mockResolvedValue(mockTranslations);

      const result = await repository.findTranslationsForBatchEvaluation('branch-1', ['de', 'fr']);

      expect(mockPrisma.translation.findMany).toHaveBeenCalledWith({
        where: {
          key: { branchId: 'branch-1' },
          value: { not: '' },
          language: { in: ['de', 'fr'] },
        },
        select: {
          id: true,
          keyId: true,
          language: true,
          value: true,
          qualityScore: {
            select: { contentHash: true },
          },
        },
      });
      expect(result).toEqual(mockTranslations);
    });

    it('should find translations by specific IDs when provided', async () => {
      const repository = createRepository();

      const mockTranslations = [
        {
          id: 'trans-1',
          keyId: 'key-1',
          language: 'de',
          value: 'Hallo',
          qualityScore: null,
        },
      ];

      mockPrisma.translation.findMany.mockResolvedValue(mockTranslations);

      const result = await repository.findTranslationsForBatchEvaluation(
        'branch-1',
        ['de', 'fr'],
        ['trans-1']
      );

      expect(mockPrisma.translation.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['trans-1'] } },
        select: {
          id: true,
          keyId: true,
          language: true,
          value: true,
          qualityScore: {
            select: { contentHash: true },
          },
        },
      });
      expect(result).toEqual(mockTranslations);
    });

    it('should return empty array when no translations found', async () => {
      const repository = createRepository();

      mockPrisma.translation.findMany.mockResolvedValue([]);

      const result = await repository.findTranslationsForBatchEvaluation('branch-1', ['de', 'fr']);

      expect(result).toEqual([]);
    });
  });

  describe('findSourceTranslationsForKeys', () => {
    it('should find source translations and return as map', async () => {
      const repository = createRepository();

      const mockSources = [
        { keyId: 'key-1', value: 'Hello World' },
        { keyId: 'key-2', value: 'Goodbye' },
      ];

      mockPrisma.translation.findMany.mockResolvedValue(mockSources);

      const result = await repository.findSourceTranslationsForKeys(['key-1', 'key-2'], 'en');

      expect(mockPrisma.translation.findMany).toHaveBeenCalledWith({
        where: {
          keyId: { in: ['key-1', 'key-2'] },
          language: 'en',
        },
        select: { keyId: true, value: true },
      });
      expect(result).toBeInstanceOf(Map);
      expect(result.get('key-1')).toBe('Hello World');
      expect(result.get('key-2')).toBe('Goodbye');
    });

    it('should return empty map when no sources found', async () => {
      const repository = createRepository();

      mockPrisma.translation.findMany.mockResolvedValue([]);

      const result = await repository.findSourceTranslationsForKeys(['key-1'], 'en');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return empty map when keyIds array is empty', async () => {
      const repository = createRepository();

      const result = await repository.findSourceTranslationsForKeys([], 'en');

      expect(mockPrisma.translation.findMany).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });
});
