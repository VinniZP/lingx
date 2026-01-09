/**
 * Authentication Routes
 *
 * Handles user registration, login, logout, and API key management.
 * Rate limited to 10 req/min per Design Doc security requirements.
 *
 * Routes are thin - they validate, authorize, and dispatch to CQRS buses.
 */
import rateLimit from '@fastify/rate-limit';
import {
  apiKeyListResponseSchema,
  authResponseSchema,
  createApiKeyResponseSchema,
  createApiKeySchema,
  loginSchema,
  messageResponseSchema,
  registerSchema,
  twoFactorRequiredResponseSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { toApiKeyCreatedDtoFromService, toApiKeyDtoList, toUserDto } from '../dto/index.js';

// CQRS Commands and Queries
import {
  CreateApiKeyCommand,
  GetCurrentUserQuery,
  ListApiKeysQuery,
  LoginUserCommand,
  LogoutUserCommand,
  RegisterUserCommand,
  RevokeApiKeyCommand,
} from '../modules/auth/index.js';
import { IsDeviceTrustedQuery } from '../modules/mfa/index.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Rate limit auth endpoints (10 req/min per Design Doc, relaxed in dev/test)
  const isProduction = process.env.NODE_ENV === 'production';
  await fastify.register(rateLimit, {
    max: isProduction ? 10 : 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.ip;
    },
  });

  /**
   * POST /api/auth/register
   *
   * Create a new user account with email and password.
   */
  app.post(
    '/api/auth/register',
    {
      schema: {
        description: 'Register a new user',
        tags: ['Auth'],
        body: registerSchema,
        response: {
          201: authResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;

      const user = await fastify.commandBus.execute(
        new RegisterUserCommand(email, password, name || undefined)
      );

      return reply.status(201).send({ user: toUserDto(user) });
    }
  );

  /**
   * POST /api/auth/login
   *
   * Authenticate with email and password.
   * If 2FA is enabled and device not trusted, returns tempToken for 2FA verification.
   * Otherwise, creates a session and returns JWT in HttpOnly cookie (24h expiry).
   */
  app.post(
    '/api/auth/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['Auth'],
        body: loginSchema,
        response: {
          200: z.union([authResponseSchema, twoFactorRequiredResponseSchema]),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      // Check for device trust via existing session cookie (HTTP-specific logic)
      let isDeviceTrusted = false;
      try {
        await request.jwtVerify();
        if (request.user?.sessionId) {
          try {
            isDeviceTrusted = await fastify.queryBus.execute(
              new IsDeviceTrustedQuery(request.user.sessionId)
            );
          } catch (err) {
            // Log service errors but continue with untrusted device
            fastify.log.error(
              { err, sessionId: request.user.sessionId },
              'Failed to check device trust status'
            );
          }
        }
      } catch {
        // JWT verification failed - this is expected for unauthenticated requests
      }

      const result = await fastify.commandBus.execute(
        new LoginUserCommand(email, password, request, isDeviceTrusted)
      );

      // Handle 2FA required response
      if ('requiresTwoFactor' in result) {
        // Generate tempToken for 2FA verification (HTTP-specific)
        const tempToken = fastify.jwt.sign(
          { userId: result.userId, purpose: '2fa' },
          { expiresIn: '5m' }
        );
        return { requiresTwoFactor: true as const, tempToken };
      }

      // Generate JWT with userId and sessionId payload (HTTP-specific)
      const token = fastify.jwt.sign({ userId: result.user.id, sessionId: result.sessionId });

      // Set HttpOnly cookie per security best practices
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours in seconds
      });

      return { user: toUserDto(result.user) };
    }
  );

  /**
   * POST /api/auth/logout
   *
   * Delete the session and clear the JWT cookie.
   */
  app.post(
    '/api/auth/logout',
    {
      schema: {
        description: 'Logout and clear session',
        tags: ['Auth'],
        response: {
          200: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // Get sessionId from JWT if available (HTTP-specific)
      let sessionId: string | undefined;
      try {
        await request.jwtVerify();
        sessionId = request.user?.sessionId;
      } catch {
        // JWT invalid or expired
      }

      await fastify.commandBus.execute(new LogoutUserCommand(sessionId));

      // Clear cookie regardless of session deletion result (HTTP-specific)
      reply.setCookie('token', '', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
      });
      return { message: 'Logged out successfully' };
    }
  );

  /**
   * GET /api/auth/me
   *
   * Get current authenticated user information.
   * Accepts either JWT cookie or X-API-Key header.
   */
  app.get(
    '/api/auth/me',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get current user info',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        response: {
          200: authResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const user = await fastify.queryBus.execute(new GetCurrentUserQuery(request.user.userId));
      return { user: toUserDto(user) };
    }
  );

  /**
   * POST /api/auth/api-keys
   *
   * Create a new API key. The full key is returned only once.
   * Requires authentication via JWT cookie.
   */
  app.post(
    '/api/auth/api-keys',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new API key',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        body: createApiKeySchema,
        response: {
          201: createApiKeyResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name } = request.body;

      const result = await fastify.commandBus.execute(
        new CreateApiKeyCommand(name, request.user.userId)
      );

      return reply.status(201).send(toApiKeyCreatedDtoFromService(result));
    }
  );

  /**
   * GET /api/auth/api-keys
   *
   * List all active API keys for the current user.
   */
  app.get(
    '/api/auth/api-keys',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List user API keys',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: apiKeyListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const apiKeys = await fastify.queryBus.execute(new ListApiKeysQuery(request.user.userId));
      return { apiKeys: toApiKeyDtoList(apiKeys) };
    }
  );

  /**
   * DELETE /api/auth/api-keys/:id
   *
   * Revoke an API key. The key cannot be used after revocation.
   */
  app.delete(
    '/api/auth/api-keys/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Revoke an API key',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      await fastify.commandBus.execute(new RevokeApiKeyCommand(id, request.user.userId));
      return reply.status(204).send();
    }
  );
};

export default authRoutes;
