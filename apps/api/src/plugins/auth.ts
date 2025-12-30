/**
 * Authentication Plugin
 *
 * Registers JWT and cookie plugins, creates auth services,
 * and provides authentication decorators for route protection.
 */
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { ApiKeyService } from '../services/api-key.service.js';
import { AuthService } from '../services/auth.service.js';
import { SecurityService } from '../services/security.service.js';
import { UnauthorizedError } from './error-handler.js';

/**
 * Extend Fastify types with auth decorators and services
 */
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authService: AuthService;
    apiKeyService: ApiKeyService;
    securityService: SecurityService;
  }
}

/**
 * Extend JWT types with payload structure (includes sessionId for session tracking)
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; sessionId?: string };
    user: { userId: string; sessionId?: string };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Register cookie plugin first (required for JWT cookie extraction)
  await fastify.register(fastifyCookie);

  // Register JWT plugin with 24h expiry per ADR-0003
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    sign: {
      expiresIn: '24h',
    },
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Create services with Prisma client
  const authService = new AuthService(fastify.prisma);
  const apiKeyService = new ApiKeyService(fastify.prisma);
  const securityService = new SecurityService(fastify.prisma);

  fastify.decorate('authService', authService);
  fastify.decorate('apiKeyService', apiKeyService);
  fastify.decorate('securityService', securityService);

  /**
   * Required authentication decorator
   *
   * Checks for authentication via API key header or JWT cookie.
   * For JWT auth, validates session exists and is not expired.
   * Throws UnauthorizedError if not authenticated.
   */
  fastify.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    // First, try API key from X-API-Key header
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      const result = await apiKeyService.validateKey(apiKey);
      if (result) {
        request.user = { userId: result.userId };
        return;
      }
      throw new UnauthorizedError('Invalid or revoked API key');
    }

    // Then, try JWT from cookie
    try {
      await request.jwtVerify();

      // Validate session if sessionId is present in JWT
      // (JWTs without sessionId are from before session tracking was added)
      if (request.user.sessionId) {
        const isValid = await securityService.validateSession(request.user.sessionId);
        if (!isValid) {
          throw new UnauthorizedError('Session expired or revoked');
        }

        // Update session activity (fire and forget)
        securityService.updateSessionActivity(request.user.sessionId).catch(() => {});
      }

      return;
    } catch (err) {
      // Re-throw our custom errors
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      throw new UnauthorizedError('Authentication required');
    }
  });

  /**
   * Optional authentication decorator
   *
   * Attempts to authenticate but doesn't throw if not authenticated.
   * Useful for endpoints that behave differently for authenticated users.
   */
  fastify.decorate('authenticateOptional', async function (request: FastifyRequest, _reply: FastifyReply) {
    // Try API key
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      const result = await apiKeyService.validateKey(apiKey);
      if (result) {
        request.user = { userId: result.userId };
        return;
      }
    }

    // Try JWT
    try {
      await request.jwtVerify();

      // Validate session if sessionId is present
      if (request.user?.sessionId) {
        const isValid = await securityService.validateSession(request.user.sessionId);
        if (!isValid) {
          // Clear user if session is invalid
          request.user = undefined as unknown as typeof request.user;
          return;
        }

        // Update session activity (fire and forget)
        securityService.updateSessionActivity(request.user.sessionId).catch(() => {});
      }
    } catch {
      // Silently fail - optional auth
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
});
