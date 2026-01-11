/**
 * Awilix Dependency Injection Container Setup
 *
 * Provides a centralized IoC container for the Lingx API.
 * Registers CQRS buses and allows modules to register their handlers.
 */

import type { PrismaClient } from '@prisma/client';
import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer,
} from 'awilix';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';
import { mtBatchQueue } from '../../lib/queues.js';
import { redis } from '../../lib/redis.js';
import { SessionCacheService } from '../../modules/security/session-cache.service.js';
import { SessionRepository } from '../../modules/security/session.repository.js';
import { UserRepository } from '../../modules/security/user.repository.js';
import type { TranslationRepository } from '../../modules/translation/repositories/translation.repository.js';
import { AccessService } from '../../services/access.service.js';
import { ActivityService } from '../../services/activity.service.js';
import { ApiKeyService } from '../../services/api-key.service.js';
import { AuthService } from '../../services/auth.service.js';
import { BatchEvaluationService } from '../../services/batch-evaluation.service.js';
import { ChallengeStore } from '../../services/challenge-store.service.js';
import { EmailService } from '../../services/email.service.js';
import { FileStorageService } from '../../services/file-storage.service.js';
import { KeyContextService } from '../../services/key-context.service.js';
import { MTService } from '../../services/mt.service.js';
import { QualityEstimationService } from '../../services/quality-estimation.service.js';
import {
  AIEvaluator,
  CircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  GlossaryEvaluator,
  ScoreRepository,
} from '../../services/quality/index.js';
import { CommandBus, EventBus, QueryBus } from '../cqrs/index.js';

/**
 * Cradle interface defines all registered dependencies.
 * Uses index signature to allow dynamic handler registrations.
 */
export interface Cradle {
  // Infrastructure
  prisma: PrismaClient;
  logger: FastifyBaseLogger;
  redis: Redis;

  // Services
  accessService: AccessService;
  activityService: ActivityService;
  authService: AuthService;
  apiKeyService: ApiKeyService;
  batchEvaluationService: BatchEvaluationService;
  emailService: EmailService;
  fileStorage: FileStorageService;
  keyContextService: KeyContextService;
  mtService: MTService;
  qualityEstimationService: QualityEstimationService;
  challengeStore: ChallengeStore;

  // Security module dependencies
  sessionRepository: SessionRepository;
  sessionCacheService: SessionCacheService;
  userRepository: UserRepository;

  // Quality estimation dependencies
  scoreRepository: ScoreRepository;
  aiEvaluator: AIEvaluator;
  glossaryEvaluator: GlossaryEvaluator;

  // Queues
  mtBatchQueue: typeof mtBatchQueue;

  // CQRS Buses
  commandBus: CommandBus;
  queryBus: QueryBus;
  eventBus: EventBus;

  // Repositories
  translationRepository: TranslationRepository;

  // Allow dynamic handler registrations
  [key: string]: unknown;
}

/**
 * Create and configure the application container.
 * @param prisma - PrismaClient instance for database access
 * @param logger - Fastify logger instance for structured logging
 * @returns Configured Awilix container
 */
export function createAppContainer(
  prisma: PrismaClient,
  logger: FastifyBaseLogger
): AwilixContainer<Cradle> {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.CLASSIC,
    strict: true,
  });

  // Register infrastructure
  container.register({
    prisma: asValue(prisma),
    logger: asValue(logger),
    redis: asValue(redis),
  });

  // Register services
  container.register({
    accessService: asClass(AccessService).singleton(),
    activityService: asClass(ActivityService).singleton(),
    authService: asClass(AuthService).singleton(),
    apiKeyService: asClass(ApiKeyService).singleton(),
    emailService: asClass(EmailService).singleton(),
    fileStorage: asClass(FileStorageService).singleton(),
    keyContextService: asClass(KeyContextService).singleton(),
    mtService: asClass(MTService).singleton(),

    // Security module dependencies
    sessionRepository: asClass(SessionRepository).singleton(),
    sessionCacheService: asClass(SessionCacheService).singleton(),
    userRepository: asClass(UserRepository).singleton(),

    // Quality estimation dependencies
    scoreRepository: asClass(ScoreRepository).singleton(),
    aiEvaluator: asFunction(
      () => new AIEvaluator(new CircuitBreaker(DEFAULT_CIRCUIT_BREAKER_CONFIG))
    ).singleton(),
    glossaryEvaluator: asClass(GlossaryEvaluator).singleton(),

    // Quality estimation service
    qualityEstimationService: asClass(QualityEstimationService).singleton(),

    // Batch evaluation
    mtBatchQueue: asValue(mtBatchQueue),
    batchEvaluationService: asClass(BatchEvaluationService).singleton(),
    challengeStore: asClass(ChallengeStore).singleton(),
  });

  // Register the container itself so buses can resolve it
  container.register({
    container: asValue(container),
  });

  // Register CQRS buses (they need the container reference)
  container.register({
    commandBus: asClass(CommandBus).singleton(),
    queryBus: asClass(QueryBus).singleton(),
    eventBus: asClass(EventBus).singleton(),
  });

  return container;
}

/**
 * Module registration function type.
 * Each module exports a function that registers its handlers.
 */
export type ModuleRegistrar = (container: AwilixContainer<Cradle>) => void;

/**
 * Register all domain modules with the container.
 * Called after container creation to set up handlers.
 */
export function registerModules(
  container: AwilixContainer<Cradle>,
  modules: ModuleRegistrar[]
): void {
  for (const registerModule of modules) {
    registerModule(container);
  }
}
