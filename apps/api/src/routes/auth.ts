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
  twoFactorRequiredResponseSchema,
} from '@lingx/shared';
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
   * If 2FA is enabled and device not trusted, returns tempToken for 2FA verification.
   * Otherwise, creates a session and returns JWT in HttpOnly cookie (24h expiry).
   */
  app.post('/api/auth/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['Auth'],
      body: loginSchema,
      response: {
        200: z.union([authResponseSchema, twoFactorRequiredResponseSchema]),
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    const user = await fastify.authService.login({ email, password });

    // Check if 2FA is enabled
    if (user.totpEnabled) {
      // Check for device trust via existing session cookie
      let isDeviceTrusted = false;
      try {
        await request.jwtVerify();
        if (request.user?.sessionId) {
          isDeviceTrusted = await fastify.totpService.isDeviceTrusted(request.user.sessionId);
        }
      } catch {
        // No valid session - device is not trusted
      }

      if (!isDeviceTrusted) {
        // Return temp token for 2FA verification
        const tempToken = fastify.jwt.sign(
          { userId: user.id, purpose: '2fa' },
          { expiresIn: '5m' }
        );

        return { requiresTwoFactor: true as const, tempToken };
      }
    }

    // No 2FA or device is trusted - proceed with normal login
    const session = await fastify.securityService.createSession(user.id, request);

    // Generate JWT with userId and sessionId payload
    const token = fastify.jwt.sign({ userId: user.id, sessionId: session.id });

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
   * Delete the session and clear the JWT cookie.
   */
  app.post('/api/auth/logout', {
    schema: {
      description: 'Logout and clear session',
      tags: ['Auth'],
      response: {
        200: messageResponseSchema,
      },
    },
  }, async (request, reply) => {
    // Try to delete session if user is authenticated with a session
    try {
      await request.jwtVerify();
      if (request.user?.sessionId) {
        await fastify.securityService.deleteSession(request.user.sessionId);
      }
    } catch {
      // JWT invalid or expired - session may already be gone
    }

    // Clear cookie regardless of session deletion result
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
