/**
 * Authentication Plugin
 *
 * Registers JWT and cookie plugins, creates auth services,
 * and provides authentication decorators for route protection.
 */
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { UpdateSessionActivityCommand } from '../modules/security/commands/update-session-activity.command.js';
import { ValidateSessionQuery } from '../modules/security/queries/validate-session.query.js';
import { ApiKeyService } from '../services/api-key.service.js';
import { AuthService } from '../services/auth.service.js';
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
  }
}

/**
 * Extend JWT types with payload structure (includes sessionId for session tracking)
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; sessionId?: string; purpose?: string };
    user: { userId: string; sessionId?: string; purpose?: string };
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

  fastify.decorate('authService', authService);
  fastify.decorate('apiKeyService', apiKeyService);

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
        const isValid = await fastify.queryBus.execute(
          new ValidateSessionQuery(request.user.sessionId)
        );
        if (!isValid) {
          throw new UnauthorizedError('Session expired or revoked');
        }

        // Update session activity (fire and forget with logging)
        fastify.commandBus
          .execute(new UpdateSessionActivityCommand(request.user.sessionId))
          .catch((err) => {
            fastify.log.warn(
              { err, sessionId: request.user.sessionId },
              'Failed to update session activity'
            );
          });
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
  fastify.decorate(
    'authenticateOptional',
    async function (request: FastifyRequest, _reply: FastifyReply) {
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
          const isValid = await fastify.queryBus.execute(
            new ValidateSessionQuery(request.user.sessionId)
          );
          if (!isValid) {
            // Clear user if session is invalid
            request.user = undefined as unknown as typeof request.user;
            return;
          }

          // Update session activity (fire and forget with logging)
          fastify.commandBus
            .execute(new UpdateSessionActivityCommand(request.user.sessionId))
            .catch((err) => {
              fastify.log.warn(
                { err, sessionId: request.user.sessionId },
                'Failed to update session activity'
              );
            });
        }
      } catch (err) {
        // Only silently fail for expected auth failures (no token, expired token)
        // Log unexpected errors for debugging
        const isExpectedAuthFailure =
          err instanceof Error &&
          (err.message.includes('No Authorization') ||
            err.message.includes('expired') ||
            err.message.includes('jwt'));
        if (!isExpectedAuthFailure) {
          fastify.log.warn(
            { err, url: request.url },
            'Unexpected error during optional authentication'
          );
        }
      }
    }
  );
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma', 'cqrs'],
});
