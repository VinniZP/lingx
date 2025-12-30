/**
 * Authentication Routes
 *
 * Handles user registration, login, logout, and API key management.
 * Rate limited to 10 req/min per Design Doc security requirements.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  createApiKeySchema,
  authResponseSchema,
  createApiKeyResponseSchema,
  apiKeyListResponseSchema,
  messageResponseSchema,
} from '@localeflow/shared';
import {
  toUserDto,
  toApiKeyDtoList,
  toApiKeyCreatedDtoFromService,
} from '../dto/index.js';

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
  app.post('/api/auth/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Auth'],
      body: registerSchema,
      response: {
        201: authResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { email, password, name } = request.body;

    const user = await fastify.authService.register({
      email,
      password,
      name: name || undefined,
    });

    return reply.status(201).send({ user: toUserDto(user) });
  });

  /**
   * POST /api/auth/login
   *
   * Authenticate with email and password.
   * Returns JWT in HttpOnly cookie (24h expiry).
   */
  app.post('/api/auth/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['Auth'],
      body: loginSchema,
      response: {
        200: authResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    const user = await fastify.authService.login({ email, password });

    // Generate JWT with userId payload
    const token = fastify.jwt.sign({ userId: user.id });

    // Set HttpOnly cookie per security best practices
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours in seconds
    });

    return { user: toUserDto(user) };
  });

  /**
   * POST /api/auth/logout
   *
   * Clear the JWT cookie to end the session.
   */
  app.post('/api/auth/logout', {
    schema: {
      description: 'Logout and clear session',
      tags: ['Auth'],
      response: {
        200: messageResponseSchema,
      },
    },
  }, async (_request, reply) => {
    // Explicitly set cookie to empty with expired date
    // Using setCookie with maxAge=0 is more reliable than clearCookie for cross-origin
    reply.setCookie('token', '', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
    });
    return { message: 'Logged out successfully' };
  });

  /**
   * GET /api/auth/me
   *
   * Get current authenticated user information.
   * Accepts either JWT cookie or X-API-Key header.
   */
  app.get('/api/auth/me', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get current user info',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
      response: {
        200: authResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const user = await fastify.authService.getUserById(request.user.userId);
    if (!user) {
      throw new Error('User not found');
    }
    return { user: toUserDto(user) };
  });

  /**
   * POST /api/auth/api-keys
   *
   * Create a new API key. The full key is returned only once.
   * Requires authentication via JWT cookie.
   */
  app.post('/api/auth/api-keys', {
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
  }, async (request, reply) => {
    const { name } = request.body;

    const result = await fastify.apiKeyService.create({
      name,
      userId: request.user.userId,
    });

    return reply.status(201).send(toApiKeyCreatedDtoFromService(result));
  });

  /**
   * GET /api/auth/api-keys
   *
   * List all active API keys for the current user.
   */
  app.get('/api/auth/api-keys', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'List user API keys',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: apiKeyListResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const apiKeys = await fastify.apiKeyService.list(request.user.userId);
    return { apiKeys: toApiKeyDtoList(apiKeys) };
  });

  /**
   * DELETE /api/auth/api-keys/:id
   *
   * Revoke an API key. The key cannot be used after revocation.
   */
  app.delete('/api/auth/api-keys/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Revoke an API key',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      params: z.object({
        id: z.string(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params;
    await fastify.apiKeyService.revoke(id, request.user.userId);
    return reply.status(204).send();
  });
};

export default authRoutes;
