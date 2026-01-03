/**
 * Quality Estimation Service Factory
 *
 * Creates fully-configured service instances.
 * Use this in routes and workers instead of directly instantiating.
 */

import { PrismaClient } from '@prisma/client';
import type { Queue } from 'bullmq';
import { QualityEstimationService } from '../quality-estimation.service.js';
import { BatchEvaluationService } from '../batch-evaluation.service.js';
import { KeyContextService } from '../key-context.service.js';
import {
  CircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  ScoreRepository,
  AIEvaluator,
  GlossaryEvaluator,
} from './index.js';

/**
 * Create a fully-configured QualityEstimationService for production use.
 */
export function createQualityEstimationService(prisma: PrismaClient): QualityEstimationService {
  const circuitBreaker = new CircuitBreaker(DEFAULT_CIRCUIT_BREAKER_CONFIG);

  return new QualityEstimationService(
    prisma,
    new ScoreRepository(prisma),
    new AIEvaluator(circuitBreaker),
    new GlossaryEvaluator(prisma),
    new KeyContextService(prisma),
  );
}

/**
 * Create a BatchEvaluationService for batch quality operations.
 */
export function createBatchEvaluationService(
  prisma: PrismaClient,
  queue: Queue
): BatchEvaluationService {
  return new BatchEvaluationService(prisma, queue);
}
