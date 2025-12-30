import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';

import prismaPlugin from './plugins/prisma.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import authPlugin from './plugins/auth.js';
import profilePlugin from './plugins/profile.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import dashboardRoutes from './routes/dashboard.js';
import activityRoutes from './routes/activity.js';
import projectRoutes from './routes/projects.js';
import spaceRoutes from './routes/spaces.js';
import branchRoutes from './routes/branches.js';
import translationRoutes from './routes/translations.js';
import environmentRoutes from './routes/environments.js';
import sdkRoutes from './routes/sdk.js';
import { startWorkers, stopWorkers } from './workers/index.js';
import { closeQueues } from './lib/queues.js';
import { closeRedis } from './lib/redis.js';

/**
 * Application configuration options
 */
export interface AppOptions {
  logger?: boolean | object;
}

/**
 * Build and configure the Fastify application
 *
 * Creates a new Fastify instance with all plugins, middleware,
 * and routes registered. Suitable for both production use and testing.
 *
 * @param options - Application configuration options
 * @returns Configured Fastify instance
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: options.logger ?? {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  // Setup Zod type provider for request validation and response serialization
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', "DELETE", "PATCH"]
  });

  // Disable rate limiting in test mode to prevent test failures
  const isTestMode = process.env.NODE_ENV === 'test' || options.logger === false;
  await fastify.register(rateLimit, {
    max: isTestMode ? 10000 : 100,
    timeWindow: '1 minute',
  });

  // Register Swagger for API documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Localeflow API',
        description: 'API for Localeflow localization management platform',
        version: '0.0.0',
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:3001',
          description: 'API Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Register custom plugins
  await fastify.register(errorHandlerPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(profilePlugin);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(activityRoutes);
  await fastify.register(projectRoutes);
  await fastify.register(spaceRoutes);
  await fastify.register(branchRoutes);
  await fastify.register(translationRoutes);
  await fastify.register(environmentRoutes);
  await fastify.register(sdkRoutes);

  // Start background workers (skip in test mode)
  const skipWorkers = process.env.NODE_ENV === 'test' || options.logger === false;
  if (!skipWorkers) {
    // Start workers after prisma is ready
    fastify.addHook('onReady', async () => {
      try {
        await startWorkers(fastify.prisma);
      } catch (err) {
        fastify.log.warn({ err }, 'Failed to start workers (Redis may not be running)');
      }
    });

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      await stopWorkers();
      await closeQueues();
      await closeRedis();
    });
  }

  return fastify;
}
