import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { closeQueueEvents } from './lib/queue-events.js';
import { closeQueues } from './lib/queues.js';
import { closeRedis } from './lib/redis.js';
import authPlugin from './plugins/auth.js';
import cqrsPlugin from './plugins/cqrs.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import prismaPlugin from './plugins/prisma.js';
import profilePlugin from './plugins/profile.js';
import totpPlugin from './plugins/totp.js';
import webauthnPlugin from './plugins/webauthn.js';
import activityRoutes from './routes/activity.js';
import aiTranslationRoutes from './routes/ai-translation.js';
import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import dashboardRoutes from './routes/dashboard.js';
import environmentRoutes from './routes/environments.js';
import glossaryRoutes from './routes/glossary.js';
import healthRoutes from './routes/health.js';
import jobRoutes from './routes/jobs.js';
import keyContextRoutes from './routes/key-context.js';
import machineTranslationRoutes from './routes/machine-translation.js';
import profileRoutes from './routes/profile.js';
import projectRoutes from './routes/projects.js';
import qualityEstimationRoutes from './routes/quality-estimation.js';
import sdkRoutes from './routes/sdk.js';
import securityRoutes from './routes/security.js';
import spaceRoutes from './routes/spaces.js';
import totpRoutes from './routes/totp.js';
import translationMemoryRoutes from './routes/translation-memory.js';
import translationRoutes from './routes/translations.js';
import webauthnRoutes from './routes/webauthn.js';
import { startWorkers, stopWorkers } from './workers/index.js';

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
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Setup Zod type provider for request validation and response serialization
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register content type parsers for plain text and XML (used by glossary import)
  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });
  fastify.addContentTypeParser('text/xml', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });
  fastify.addContentTypeParser('application/xml', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

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
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  // Disable rate limiting in test mode to prevent test failures
  // 500/min allows for heavy translation editor usage (TM searches, MT requests)
  const isTestMode = process.env.NODE_ENV === 'test' || options.logger === false;
  await fastify.register(rateLimit, {
    max: isTestMode ? 10000 : 500,
    timeWindow: '1 minute',
  });

  // Register Swagger for API documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Lingx API',
        description: 'API for Lingx localization management platform',
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
  await fastify.register(cqrsPlugin);
  await fastify.register(authPlugin);
  await fastify.register(profilePlugin);
  await fastify.register(totpPlugin);
  await fastify.register(webauthnPlugin);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(securityRoutes);
  await fastify.register(totpRoutes);
  await fastify.register(webauthnRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(activityRoutes);
  await fastify.register(projectRoutes);
  await fastify.register(spaceRoutes);
  await fastify.register(branchRoutes);
  await fastify.register(translationRoutes);
  await fastify.register(translationMemoryRoutes);
  await fastify.register(machineTranslationRoutes);
  await fastify.register(aiTranslationRoutes);
  await fastify.register(glossaryRoutes);
  await fastify.register(keyContextRoutes);
  await fastify.register(environmentRoutes);
  await fastify.register(qualityEstimationRoutes);
  await fastify.register(sdkRoutes);
  await fastify.register(jobRoutes);

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
      await closeQueueEvents();
      await closeQueues();
      await closeRedis();
    });
  }

  return fastify;
}
