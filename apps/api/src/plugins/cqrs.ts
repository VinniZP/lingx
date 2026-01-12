import type { AwilixContainer } from 'awilix';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import type { ChallengeStore } from '../modules/mfa/webauthn/challenge-store.service.js';
import {
  createAppContainer,
  registerModules,
  type Cradle,
  type ModuleRegistrar,
} from '../shared/container/index.js';
import type { CommandBus, EventBus, QueryBus } from '../shared/cqrs/index.js';

// Import module registrars
import { registerActivityModule } from '../modules/activity/index.js';
import { registerAITranslationModule } from '../modules/ai-translation/index.js';
import { registerAuthModule } from '../modules/auth/index.js';
import { registerBranchModule } from '../modules/branch/index.js';
import { registerEnvironmentModule } from '../modules/environment/index.js';
import { registerGlossaryModule } from '../modules/glossary/index.js';
import { registerHealthModule } from '../modules/health/index.js';
import { registerKeyContextModule } from '../modules/key-context/index.js';
import { registerMachineTranslationModule } from '../modules/machine-translation/index.js';
import { registerMfaModule } from '../modules/mfa/index.js';
import { registerProfileModule } from '../modules/profile/index.js';
import { registerProjectModule } from '../modules/project/index.js';
import { registerQualityEstimationModule } from '../modules/quality-estimation/index.js';
import { registerSecurityModule } from '../modules/security/index.js';
import { registerSpaceModule } from '../modules/space/index.js';
import { registerTranslationMemoryModule } from '../modules/translation-memory/index.js';
import { registerTranslationModule } from '../modules/translation/index.js';

/**
 * All domain modules that register handlers with the container.
 * Add new modules here as they are created.
 */
const domainModules: ModuleRegistrar[] = [
  registerHealthModule,
  registerEnvironmentModule,
  registerAuthModule,
  registerActivityModule,
  registerSecurityModule,
  registerMfaModule,
  registerProfileModule,
  registerProjectModule,
  registerSpaceModule,
  registerBranchModule,
  registerTranslationModule,
  registerTranslationMemoryModule,
  registerGlossaryModule,
  registerMachineTranslationModule,
  registerAITranslationModule,
  registerQualityEstimationModule,
  registerKeyContextModule,
];

export interface CqrsPluginOptions {
  /** Additional modules to register (for testing) */
  additionalModules?: ModuleRegistrar[];
}

/**
 * CQRS Plugin for Fastify
 *
 * Sets up the Awilix dependency injection container and CQRS buses.
 * Decorates the Fastify instance with:
 * - `container`: The Awilix container
 * - `commandBus`: For executing commands
 * - `queryBus`: For executing queries
 * - `eventBus`: For publishing events
 *
 * @example
 * ```typescript
 * // In route handler
 * const result = await fastify.queryBus.execute(new GetHealthQuery());
 * ```
 */
const cqrsPlugin: FastifyPluginAsync<CqrsPluginOptions> = async (fastify, options) => {
  // Create container with Prisma client and logger
  const container = createAppContainer(fastify.prisma, fastify.log);

  // Register all domain modules
  const allModules = [...domainModules, ...(options.additionalModules ?? [])];
  registerModules(container, allModules);

  // Decorate fastify with container and buses
  fastify.decorate('container', container);
  fastify.decorate('commandBus', container.resolve('commandBus'));
  fastify.decorate('queryBus', container.resolve('queryBus'));
  fastify.decorate('eventBus', container.resolve('eventBus'));
  fastify.decorate('challengeStore', container.resolve('challengeStore'));

  fastify.log.info(`CQRS infrastructure initialized with ${allModules.length} module(s)`);
};

export default fp(cqrsPlugin, {
  name: 'cqrs',
  dependencies: ['prisma'], // Ensure prisma is registered first
});

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    container: AwilixContainer<Cradle>;
    commandBus: CommandBus;
    queryBus: QueryBus;
    eventBus: EventBus;
    challengeStore: ChallengeStore;
  }
}
