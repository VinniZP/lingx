/**
 * BatchEvaluationService Unit Tests
 *
 * Tests batch quality evaluation operations with cache pre-filtering.
 */

import type { PrismaClient } from '@prisma/client';
import type { Job, Queue } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { BatchEvaluationService } from '../../src/services/batch-evaluation.service.js';

function createMockPrisma(): PrismaClient {
  return {
    translation: {
      findMany: vi.fn(),
    },
  } as unknown as PrismaClient;
}

function createMockQueue(): Queue {
  return {
    add: vi.fn(),
  } as unknown as Queue;
}

function createMockLogger(): FastifyBaseLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as FastifyBaseLogger;
}

describe('BatchEvaluationService', () => {
  let service: BatchEvaluationService;
  let mockPrisma: PrismaClient;
  let mockQueue: Queue;
  let mockLogger: FastifyBaseLogger;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockQueue = createMockQueue();
    mockLogger = createMockLogger();
    service = new BatchEvaluationService(mockPrisma, mockQueue, mockLogger);
  });

  describe('evaluateBranch', () => {
    const projectInfo = {
      projectId: 'proj-1',
      defaultLanguage: 'en',
      languages: ['en', 'de', 'fr'],
    };

    it('should return early when no translations found', async () => {
      // No translations in branch, plus empty source translations query
      (mockPrisma.translation.findMany as Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.evaluateBranch('branch-1', 'user-1', projectInfo);

      expect(result.jobId).toBe('');
      expect(result.stats.total).toBe(0);
      expect(result.stats.cached).toBe(0);
      expect(result.stats.queued).toBe(0);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should queue translations without cached scores', async () => {
      (mockPrisma.translation.findMany as Mock)
        .mockResolvedValueOnce([
          {
            id: 'trans-1',
            keyId: 'key-1',
            language: 'de',
            value: 'Hallo Welt',
            qualityScore: null, // No cache
          },
          {
            id: 'trans-2',
            keyId: 'key-1',
            language: 'fr',
            value: 'Bonjour le monde',
            qualityScore: null, // No cache
          },
        ])
        .mockResolvedValueOnce([{ keyId: 'key-1', value: 'Hello World' }]);

      (mockQueue.add as Mock).mockResolvedValue({ id: 'job-123' } as Job);

      const result = await service.evaluateBranch('branch-1', 'user-1', projectInfo);

      expect(result.jobId).toBe('job-123');
      expect(result.stats.total).toBe(2);
      expect(result.stats.queued).toBe(2);
      expect(result.stats.cached).toBe(0);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'quality-batch',
        expect.objectContaining({
          type: 'quality-batch',
          projectId: 'proj-1',
          userId: 'user-1',
          branchId: 'branch-1',
          translationIds: ['trans-1', 'trans-2'],
          forceAI: false,
        })
      );
    });

    it('should filter by translationIds when provided', async () => {
      (mockPrisma.translation.findMany as Mock)
        .mockResolvedValueOnce([
          {
            id: 'trans-1',
            keyId: 'key-1',
            language: 'de',
            value: 'Hallo',
            qualityScore: null,
          },
        ])
        .mockResolvedValueOnce([{ keyId: 'key-1', value: 'Hello' }]);

      (mockQueue.add as Mock).mockResolvedValue({ id: 'job-456' } as Job);

      await service.evaluateBranch('branch-1', 'user-1', projectInfo, {
        translationIds: ['trans-1'],
      });

      expect(mockPrisma.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['trans-1'] } },
        })
      );
    });

    it('should pass forceAI flag to job', async () => {
      (mockPrisma.translation.findMany as Mock)
        .mockResolvedValueOnce([
          {
            id: 'trans-1',
            keyId: 'key-1',
            language: 'de',
            value: 'Test',
            qualityScore: null,
          },
        ])
        .mockResolvedValueOnce([{ keyId: 'key-1', value: 'Test' }]);

      (mockQueue.add as Mock).mockResolvedValue({ id: 'job-789' } as Job);

      await service.evaluateBranch('branch-1', 'user-1', projectInfo, {
        forceAI: true,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'quality-batch',
        expect.objectContaining({
          forceAI: true,
        })
      );
    });

    it('should throw when batch size exceeds maximum', async () => {
      const tooManyIds = Array.from({ length: 1001 }, (_, i) => `trans-${i}`);

      await expect(
        service.evaluateBranch('branch-1', 'user-1', projectInfo, {
          translationIds: tooManyIds,
        })
      ).rejects.toThrow('Batch size exceeds maximum');
    });

    it('should queue translations with stale cache', async () => {
      (mockPrisma.translation.findMany as Mock)
        .mockResolvedValueOnce([
          {
            id: 'trans-1',
            keyId: 'key-1',
            language: 'de',
            value: 'Hallo Welt - updated', // Changed value
            qualityScore: { contentHash: 'old-hash' }, // Old hash
          },
        ])
        .mockResolvedValueOnce([{ keyId: 'key-1', value: 'Hello World' }]);

      (mockQueue.add as Mock).mockResolvedValue({ id: 'job-stale' } as Job);

      const result = await service.evaluateBranch('branch-1', 'user-1', projectInfo);

      expect(result.stats.queued).toBe(1);
      expect(result.stats.cached).toBe(0);
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should queue translations without source translation', async () => {
      (mockPrisma.translation.findMany as Mock)
        .mockResolvedValueOnce([
          {
            id: 'trans-1',
            keyId: 'key-1',
            language: 'de',
            value: 'Hallo',
            qualityScore: { contentHash: 'some-hash' },
          },
        ])
        // No source translations found
        .mockResolvedValueOnce([]);

      (mockQueue.add as Mock).mockResolvedValue({ id: 'job-nosrc' } as Job);

      const result = await service.evaluateBranch('branch-1', 'user-1', projectInfo);

      expect(result.stats.queued).toBe(1);
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
