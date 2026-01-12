import type { Prisma, PrismaClient, RelationshipType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyContextRepository } from '../repositories/key-context.repository.js';

describe('KeyContextRepository', () => {
  const mockTx = {
    translationKey: {
      updateMany: vi.fn(),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn((cb: (tx: typeof mockTx) => Promise<void>) => cb(mockTx)),
    $queryRaw: vi.fn(),
    translationKey: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    keyRelationship: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
  };

  const createRepository = () => new KeyContextRepository(mockPrisma as unknown as PrismaClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateKeySourceInfo', () => {
    it('should update key source info in batches', async () => {
      const repository = createRepository();

      const contexts = [
        { name: 'key1', namespace: null, sourceFile: '/src/app.tsx', sourceLine: 10 },
        { name: 'key2', namespace: 'common', sourceFile: '/src/common.tsx', sourceLine: 20 },
      ];

      mockTx.translationKey.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 });

      const result = await repository.updateKeySourceInfo('branch-1', contexts);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.translationKey.updateMany).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ updated: 2, notFound: 0 });
    });

    it('should track not found keys', async () => {
      const repository = createRepository();

      const contexts = [
        { name: 'key1', namespace: null, sourceFile: '/src/app.tsx' },
        { name: 'nonexistent', namespace: null, sourceFile: '/src/other.tsx' },
      ];

      mockTx.translationKey.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      const result = await repository.updateKeySourceInfo('branch-1', contexts);

      expect(result).toEqual({ updated: 1, notFound: 1 });
    });
  });

  describe('findKeysWithSourceInfo', () => {
    it('should find keys with source file or component', async () => {
      const repository = createRepository();

      const mockKeys = [
        { id: 'key-1', sourceFile: '/src/app.tsx', sourceLine: 10, sourceComponent: 'App' },
        { id: 'key-2', sourceFile: '/src/nav.tsx', sourceLine: 5, sourceComponent: null },
      ];

      mockPrisma.translationKey.findMany.mockResolvedValue(mockKeys);

      const result = await repository.findKeysWithSourceInfo('branch-1');

      expect(mockPrisma.translationKey.findMany).toHaveBeenCalledWith({
        where: {
          branchId: 'branch-1',
          OR: [{ sourceFile: { not: null } }, { sourceComponent: { not: null } }],
        },
        select: {
          id: true,
          sourceFile: true,
          sourceLine: true,
          sourceComponent: true,
        },
      });
      expect(result).toEqual(mockKeys);
    });
  });

  describe('deleteSourceBasedRelationships', () => {
    it('should delete SAME_FILE, SAME_COMPONENT, and NEARBY relationships', async () => {
      const repository = createRepository();

      mockPrisma.keyRelationship.deleteMany.mockResolvedValue({ count: 10 });

      await repository.deleteSourceBasedRelationships('branch-1');

      expect(mockPrisma.keyRelationship.deleteMany).toHaveBeenCalledWith({
        where: {
          fromKey: { branchId: 'branch-1' },
          type: { in: ['SAME_FILE', 'SAME_COMPONENT', 'NEARBY'] },
        },
      });
    });
  });

  describe('createRelationships', () => {
    it('should create relationships with skipDuplicates', async () => {
      const repository = createRepository();

      const relationships: Prisma.KeyRelationshipCreateManyInput[] = [
        { fromKeyId: 'key-1', toKeyId: 'key-2', type: 'SAME_FILE', confidence: 0.9 },
        { fromKeyId: 'key-1', toKeyId: 'key-3', type: 'NEARBY', confidence: 0.8 },
      ];

      mockPrisma.keyRelationship.createMany.mockResolvedValue({ count: 2 });

      await repository.createRelationships(relationships);

      expect(mockPrisma.keyRelationship.createMany).toHaveBeenCalledWith({
        data: relationships,
        skipDuplicates: true,
      });
    });

    it('should handle empty relationships array', async () => {
      const repository = createRepository();

      await repository.createRelationships([]);

      expect(mockPrisma.keyRelationship.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findBranchKeys', () => {
    it('should find all keys in a branch', async () => {
      const repository = createRepository();

      const mockKeys = [
        { id: 'key-1', name: 'greeting.hello' },
        { id: 'key-2', name: 'greeting.goodbye' },
      ];

      mockPrisma.translationKey.findMany.mockResolvedValue(mockKeys);

      const result = await repository.findBranchKeys('branch-1');

      expect(mockPrisma.translationKey.findMany).toHaveBeenCalledWith({
        where: { branchId: 'branch-1' },
        select: { id: true, name: true },
      });
      expect(result).toEqual(mockKeys);
    });
  });

  describe('deleteKeyPatternRelationships', () => {
    it('should delete KEY_PATTERN relationships for branch', async () => {
      const repository = createRepository();

      mockPrisma.keyRelationship.deleteMany.mockResolvedValue({ count: 5 });

      await repository.deleteKeyPatternRelationships('branch-1');

      expect(mockPrisma.keyRelationship.deleteMany).toHaveBeenCalledWith({
        where: {
          fromKey: { branchId: 'branch-1' },
          type: 'KEY_PATTERN',
        },
      });
    });
  });

  describe('deleteSemanticRelationships', () => {
    it('should delete SEMANTIC relationships for branch', async () => {
      const repository = createRepository();

      mockPrisma.keyRelationship.deleteMany.mockResolvedValue({ count: 3 });

      await repository.deleteSemanticRelationships('branch-1');

      expect(mockPrisma.keyRelationship.deleteMany).toHaveBeenCalledWith({
        where: {
          fromKey: { branchId: 'branch-1' },
          type: 'SEMANTIC',
        },
      });
    });
  });

  describe('findSemanticMatches', () => {
    it('should find semantic matches using raw SQL', async () => {
      const repository = createRepository();

      const mockMatches = [
        { fromKeyId: 'key-1', toKeyId: 'key-2', similarity: 0.85 },
        { fromKeyId: 'key-3', toKeyId: 'key-4', similarity: 0.72 },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockMatches);

      const result = await repository.findSemanticMatches('branch-1', 'en', 0.7);

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual(mockMatches);
    });
  });

  describe('findKeyRelationships', () => {
    it('should find relationships for a key with translations', async () => {
      const repository = createRepository();

      const types: RelationshipType[] = ['SAME_FILE', 'SAME_COMPONENT'];
      const mockRelationships = [
        {
          id: 'rel-1',
          fromKeyId: 'key-1',
          toKeyId: 'key-2',
          type: 'SAME_FILE',
          confidence: 0.9,
          fromKey: { id: 'key-1', name: 'key1', translations: [] },
          toKey: { id: 'key-2', name: 'key2', translations: [] },
        },
      ];

      mockPrisma.keyRelationship.findMany.mockResolvedValue(mockRelationships);

      const result = await repository.findKeyRelationships('key-1', types, true);

      expect(mockPrisma.keyRelationship.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { fromKeyId: 'key-1', type: { in: types } },
            { toKeyId: 'key-1', type: { in: types } },
          ],
        },
        include: {
          fromKey: {
            include: { translations: { select: { language: true, value: true, status: true } } },
          },
          toKey: {
            include: { translations: { select: { language: true, value: true, status: true } } },
          },
        },
        orderBy: { confidence: 'desc' },
      });
      expect(result).toEqual(mockRelationships);
    });

    it('should find relationships without translations', async () => {
      const repository = createRepository();

      const types: RelationshipType[] = ['NEARBY'];
      const mockRelationships = [
        {
          id: 'rel-1',
          fromKeyId: 'key-1',
          toKeyId: 'key-2',
          type: 'NEARBY',
          confidence: 0.8,
          fromKey: { id: 'key-1', name: 'key1' },
          toKey: { id: 'key-2', name: 'key2' },
        },
      ];

      mockPrisma.keyRelationship.findMany.mockResolvedValue(mockRelationships);

      const result = await repository.findKeyRelationships('key-1', types, false);

      expect(mockPrisma.keyRelationship.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { fromKeyId: 'key-1', type: { in: types } },
            { toKeyId: 'key-1', type: { in: types } },
          ],
        },
        include: {
          fromKey: true,
          toKey: true,
        },
        orderBy: { confidence: 'desc' },
      });
      expect(result).toEqual(mockRelationships);
    });
  });

  describe('getRelationshipCounts', () => {
    it('should return counts for all relationship types', async () => {
      const repository = createRepository();

      mockPrisma.keyRelationship.count
        .mockResolvedValueOnce(10) // SAME_FILE
        .mockResolvedValueOnce(5) // SAME_COMPONENT
        .mockResolvedValueOnce(3) // SEMANTIC
        .mockResolvedValueOnce(8) // NEARBY
        .mockResolvedValueOnce(15); // KEY_PATTERN
      mockPrisma.translationKey.count.mockResolvedValue(25);

      const result = await repository.getRelationshipCounts('branch-1');

      expect(result).toEqual({
        sameFile: 10,
        sameComponent: 5,
        semantic: 3,
        nearby: 8,
        keyPattern: 15,
        keysWithSource: 25,
      });
    });
  });
});
