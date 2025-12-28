/**
 * Authentication Routes
 *
 * Handles user registration, login, logout, and API key management.
 * Rate limited to 10 req/min per Design Doc security requirements.
 */
import { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {
  registerSchema,
  loginSchema,
  meSchema,
  createApiKeySchema,
  listApiKeysSchema,
} from '../schemas/auth.schema.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
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
  fastify.post('/api/auth/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Auth'],
      ...registerSchema,
    },
  }, async (request, reply) => {
    const { email, password, name } = request.body as {
      email: string;
      password: string;
      name?: string;
    };

    const user = await fastify.authService.register({ email, password, name });

    return reply.status(201).send({ user });
  });

  /**
   * POST /api/auth/login
   *
   * Authenticate with email and password.
   * Returns JWT in HttpOnly cookie (24h expiry).
   */
  fastify.post('/api/auth/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['Auth'],
      ...loginSchema,
    },
  }, async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

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

    return { user };
  });

  /**
   * POST /api/auth/logout
   *
   * Clear the JWT cookie to end the session.
   */
  fastify.post('/api/auth/logout', {
    schema: {
      description: 'Logout and clear session',
      tags: ['Auth'],
    },
  }, async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { message: 'Logged out successfully' };
  });

  /**
   * GET /api/auth/me
   *
   * Get current authenticated user information.
   * Accepts either JWT cookie or X-API-Key header.
   */
  fastify.get('/api/auth/me', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get current user info',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
      ...meSchema,
    },
  }, async (request, _reply) => {
    const user = await fastify.authService.getUserById(request.user.userId);
    return { user };
  });

  /**
   * POST /api/auth/api-keys
   *
   * Create a new API key. The full key is returned only once.
   * Requires authentication via JWT cookie.
   */
  fastify.post('/api/auth/api-keys', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Create a new API key',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      ...createApiKeySchema,
    },
  }, async (request, reply) => {
    const { name, expiresAt } = request.body as {
      name: string;
      expiresAt?: string;
    };

    const result = await fastify.apiKeyService.create({
      name,
      userId: request.user.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return reply.status(201).send(result);
  });

  /**
   * GET /api/auth/api-keys
   *
   * List all active API keys for the current user.
   */
  fastify.get('/api/auth/api-keys', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'List user API keys',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      ...listApiKeysSchema,
    },
  }, async (request, _reply) => {
    const apiKeys = await fastify.apiKeyService.list(request.user.userId);
    return { apiKeys };
  });

  /**
   * DELETE /api/auth/api-keys/:id
   *
   * Revoke an API key. The key cannot be used after revocation.
   */
  fastify.delete('/api/auth/api-keys/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Revoke an API key',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await fastify.apiKeyService.revoke(id, request.user.userId);
    return reply.status(204).send();
  });
};

export default authRoutes;
