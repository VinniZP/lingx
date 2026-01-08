/**
 * Awilix Dependency Injection Container Setup
 *
 * Provides a centralized IoC container for the Lingx API.
 * Registers CQRS buses and allows modules to register their handlers.
 */

import type { PrismaClient } from '@prisma/client';
import { asClass, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { FastifyBaseLogger } from 'fastify';
import { AccessService } from '../../services/access.service.js';
import { ActivityService } from '../../services/activity.service.js';
import { ApiKeyService } from '../../services/api-key.service.js';
import { AuthService } from '../../services/auth.service.js';
import { SecurityService } from '../../services/security.service.js';
import { CommandBus, EventBus, QueryBus } from '../cqrs/index.js';

/**
 * Cradle interface defines all registered dependencies.
 * Uses index signature to allow dynamic handler registrations.
 */
export interface Cradle {
  // Infrastructure
  prisma: PrismaClient;
  logger: FastifyBaseLogger;

  // Services
  accessService: AccessService;
  activityService: ActivityService;
  authService: AuthService;
  apiKeyService: ApiKeyService;
  securityService: SecurityService;

  // CQRS Buses
  commandBus: CommandBus;
  queryBus: QueryBus;
  eventBus: EventBus;

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
  });

  // Register services
  container.register({
    accessService: asClass(AccessService).singleton(),
    activityService: asClass(ActivityService).singleton(),
    authService: asClass(AuthService).singleton(),
    apiKeyService: asClass(ApiKeyService).singleton(),
    securityService: asClass(SecurityService).singleton(),
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
