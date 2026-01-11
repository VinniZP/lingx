/**
 * Batch Evaluation Service
 *
 * Handles batch quality evaluation operations with cache pre-filtering.
 */

import { MAX_BATCH_TRANSLATION_IDS } from '@lingx/shared';
import { PrismaClient } from '@prisma/client';
import type { Queue } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import type { MTJobData } from '../workers/mt-batch.worker.js';
import { generateContentHash } from './quality/index.js';

export interface BatchEvaluationResult {
  jobId: string;
  stats: {
    total: number;
    cached: number;
    queued: number;
  };
}

export interface BatchEvaluationOptions {
  translationIds?: string[];
  forceAI?: boolean;
}

export class BatchEvaluationService {
  constructor(
    private prisma: PrismaClient,
    private mtBatchQueue: Queue,
    private logger: FastifyBaseLogger
  ) {}

  /**
   * Evaluate quality for translations in a branch
   *
   * Pre-filters cache hits to avoid unnecessary evaluations:
   * 1. Fetches all translations with their quality scores
   * 2. Compares content hashes to detect stale caches
   * 3. Queues only translations needing evaluation
   */
  async evaluateBranch(
    branchId: string,
    userId: string,
    projectInfo: {
      projectId: string;
      defaultLanguage: string;
      languages: string[];
    },
    options?: BatchEvaluationOptions
  ): Promise<BatchEvaluationResult> {
    const { translationIds, forceAI } = options || {};

    // Defensive check - primary validation is in QueueBatchEvaluationHandler
    if (translationIds && translationIds.length > MAX_BATCH_TRANSLATION_IDS) {
      throw new Error(
        `Batch size exceeds maximum allowed (${MAX_BATCH_TRANSLATION_IDS}). Received: ${translationIds.length}`
      );
    }

    const translations = await this.prisma.translation.findMany({
      where: translationIds
        ? { id: { in: translationIds } }
        : {
            key: { branchId },
            value: { not: '' },
            language: { in: projectInfo.languages },
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

    const keyIds = [...new Set(translations.map((t) => t.keyId))];
    const sourceTranslations = await this.prisma.translation.findMany({
      where: {
        keyId: { in: keyIds },
        language: projectInfo.defaultLanguage,
      },
      select: { keyId: true, value: true },
    });
    const sourceMap = new Map(sourceTranslations.map((s) => [s.keyId, s.value]));

    const needsEvaluation: string[] = [];
    let cacheHits = 0;

    for (const t of translations) {
      const sourceValue = sourceMap.get(t.keyId);
      if (!sourceValue) {
        needsEvaluation.push(t.id);
        continue;
      }

      if (!t.qualityScore?.contentHash) {
        needsEvaluation.push(t.id);
        continue;
      }

      const currentHash = generateContentHash(sourceValue, t.value);
      if (t.qualityScore.contentHash !== currentHash) {
        needsEvaluation.push(t.id);
      } else {
        cacheHits++;
      }
    }

    this.logger.info(
      {
        total: translations.length,
        cached: cacheHits,
        needsEvaluation: needsEvaluation.length,
        branchId,
      },
      'Batch evaluation pre-filter complete'
    );

    if (needsEvaluation.length === 0) {
      return {
        jobId: '',
        stats: { total: translations.length, cached: cacheHits, queued: 0 },
      };
    }

    const job = await this.mtBatchQueue.add('quality-batch', {
      type: 'quality-batch',
      projectId: projectInfo.projectId,
      userId,
      branchId,
      translationIds: needsEvaluation,
      forceAI: forceAI ?? false,
    } as MTJobData);

    if (!job.id) {
      this.logger.error(
        { branchId, translationCount: needsEvaluation.length },
        'BullMQ job created without ID - this should not happen'
      );
      throw new Error('Failed to create batch evaluation job: job ID not assigned');
    }

    this.logger.debug({ jobId: job.id, branchId }, 'Batch evaluation job queued');

    return {
      jobId: job.id,
      stats: { total: translations.length, cached: cacheHits, queued: needsEvaluation.length },
    };
  }
}
