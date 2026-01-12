import { MAX_BATCH_TRANSLATION_IDS } from '@lingx/shared';
import type { Queue } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { ValidationError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { MTJobData } from '../../../workers/mt-batch.worker.js';
import { BatchEvaluationQueuedEvent } from '../events/batch-evaluation-queued.event.js';
import { generateContentHash } from '../quality/index.js';
import type { QualityEstimationRepository } from '../repositories/quality-estimation.repository.js';
import type { QueueBatchEvaluationCommand } from './queue-batch-evaluation.command.js';

/**
 * Handler for QueueBatchEvaluationCommand.
 *
 * Evaluates quality for translations in a branch with cache pre-filtering:
 * 1. Fetches all translations with their quality scores
 * 2. Compares content hashes to detect stale caches
 * 3. Queues only translations needing evaluation
 * 4. Emits BatchEvaluationQueuedEvent
 */
export class QueueBatchEvaluationHandler implements ICommandHandler<QueueBatchEvaluationCommand> {
  constructor(
    private readonly qualityEstimationRepository: QualityEstimationRepository,
    private readonly mtBatchQueue: Queue,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: QueueBatchEvaluationCommand
  ): Promise<InferCommandResult<QueueBatchEvaluationCommand>> {
    const { branchId, userId, options } = command;
    const { translationIds, forceAI } = options;

    // Validate batch size at command layer
    if (translationIds && translationIds.length > MAX_BATCH_TRANSLATION_IDS) {
      throw new ValidationError(
        `Batch size exceeds maximum allowed (${MAX_BATCH_TRANSLATION_IDS}). Received: ${translationIds.length}`
      );
    }

    // Authorization
    const projectInfo = await this.accessService.verifyBranchAccess(userId, branchId);

    // Fetch translations for batch evaluation
    const translations = await this.qualityEstimationRepository.findTranslationsForBatchEvaluation(
      branchId,
      projectInfo.languages,
      translationIds
    );

    // Get unique key IDs and fetch source translations
    const keyIds = [...new Set(translations.map((t) => t.keyId))];
    const sourceMap = await this.qualityEstimationRepository.findSourceTranslationsForKeys(
      keyIds,
      projectInfo.defaultLanguage
    );

    // Filter translations that need evaluation (cache miss or stale)
    const needsEvaluation: string[] = [];
    let cacheHits = 0;

    for (const t of translations) {
      const sourceValue = sourceMap.get(t.keyId);

      // No source translation - needs evaluation
      if (!sourceValue) {
        needsEvaluation.push(t.id);
        continue;
      }

      // No cached score - needs evaluation
      if (!t.qualityScore?.contentHash) {
        needsEvaluation.push(t.id);
        continue;
      }

      // Check if cache is still valid
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

    // All translations cached - no job needed
    if (needsEvaluation.length === 0) {
      const result = {
        jobId: '',
        stats: { total: translations.length, cached: cacheHits, queued: 0 },
      };

      await this.eventBus.publish(
        new BatchEvaluationQueuedEvent(branchId, result.jobId, result.stats, userId)
      );

      return result;
    }

    // Queue BullMQ job for translations needing evaluation
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

    const result = {
      jobId: job.id,
      stats: { total: translations.length, cached: cacheHits, queued: needsEvaluation.length },
    };

    await this.eventBus.publish(
      new BatchEvaluationQueuedEvent(branchId, result.jobId, result.stats, userId)
    );

    return result;
  }
}
