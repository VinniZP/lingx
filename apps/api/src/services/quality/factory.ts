/**
 * Quality Estimation Service Factory
 *
 * Creates a fully-configured QualityEstimationService instance.
 * Use this in routes and workers instead of directly instantiating.
 */

import { PrismaClient } from '@prisma/client';
import { QualityEstimationService } from '../quality-estimation.service.js';
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
 *
 * @param prisma - PrismaClient instance
 * @returns Configured QualityEstimationService
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
