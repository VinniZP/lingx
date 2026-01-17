/**
 * Authentication Plugin
 *
 * Registers JWT and cookie plugins, creates auth services,
 * and provides authentication decorators for route protection.
 */
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import type { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { FastifyBaseLogger, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { ApiKeyRepository } from '../modules/auth/repositories/api-key.repository.js';
import { UpdateSessionActivityCommand } from '../modules/security/commands/update-session-activity.command.js';
import { ValidateSessionQuery } from '../modules/security/queries/validate-session.query.js';
import { ForbiddenError, UnauthorizedError } from './error-handler.js';

/**
 * Extend Fastify types with auth decorators
 */
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Extend JWT types with payload structure (includes sessionId for session tracking)
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      sessionId?: string;
      purpose?: string;
      impersonatedBy?: string;
      adminSessionId?: string; // For impersonation tokens - binds to admin's session
    };
    user: {
      userId: string;
      sessionId?: string;
      purpose?: string;
      impersonatedBy?: string;
      adminSessionId?: string;
    };
  }
}

/**
 * Validate an API key and return user info if valid.
 * Updates lastUsedAt timestamp on successful validation.
 */
async function validateApiKey(
  apiKeyRepository: ApiKeyRepository,
  key: string,
  log: FastifyBaseLogger
): Promise<{ userId: string; apiKeyId: string } | null> {
  // Hash the provided key
  const keyHash = createHash('sha256').update(key).digest('hex');

  // Find matching API key
  const apiKey = await apiKeyRepository.findByKeyHash(keyHash);

  if (!apiKey) return null;

  // Check if revoked
  if (apiKey.revokedAt) return null;

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used timestamp (fire and forget with logging)
  apiKeyRepository.updateLastUsed(apiKey.id).catch((err) => {
    log.warn({ err, apiKeyId: apiKey.id }, 'Failed to update API key lastUsedAt timestamp');
  });

  return { userId: apiKey.userId, apiKeyId: apiKey.id };
}

/**
 * Check if user is disabled.
 * Returns true if disabled, false if active, null if not found.
 */
async function isUserDisabled(prisma: PrismaClient, userId: string): Promise<boolean | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDisabled: true },
  });
  return user?.isDisabled ?? null;
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

  // Get ApiKeyRepository from container
  const apiKeyRepository = fastify.container.resolve<ApiKeyRepository>('apiKeyRepository');

  /**
   * Try to verify an impersonation token from cookie.
   * Returns the decoded payload if valid, null otherwise.
   * Also validates that the admin's session is still active (invalidates on admin logout).
   */
  async function tryImpersonationToken(
    request: FastifyRequest
  ): Promise<{ userId: string; impersonatedBy: string } | null> {
    const impersonationToken = request.cookies.impersonation_token;
    if (!impersonationToken) return null;

    try {
      const decoded = fastify.jwt.verify<{
        userId: string;
        impersonatedBy: string;
        adminSessionId?: string;
        purpose: string;
      }>(impersonationToken);

      // Verify it's actually an impersonation token
      if (decoded.purpose !== 'impersonation' || !decoded.impersonatedBy) {
        return null;
      }

      // Validate admin's session is still active (if sessionId is present)
      // This ensures impersonation is invalidated when admin logs out
      if (decoded.adminSessionId) {
        const isAdminSessionValid = await fastify.queryBus.execute(
          new ValidateSessionQuery(decoded.adminSessionId)
        );
        if (!isAdminSessionValid) {
          fastify.log.info(
            { adminSessionId: decoded.adminSessionId, impersonatedBy: decoded.impersonatedBy },
            'Impersonation token rejected: admin session no longer valid'
          );
          return null;
        }
      }

      return { userId: decoded.userId, impersonatedBy: decoded.impersonatedBy };
    } catch {
      // Token invalid or expired - fall back to regular auth
      return null;
    }
  }

  /**
   * Required authentication decorator
   *
   * Checks for authentication in this order:
   * 1. API key from X-API-Key header
   * 2. Impersonation token from impersonation_token cookie
   * 3. Regular JWT from token cookie
   *
   * For JWT auth, validates session exists and is not expired.
   * Also validates that the user account is not disabled.
   * Throws UnauthorizedError if not authenticated.
   * Throws ForbiddenError if account is disabled.
   */
  fastify.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    // First, try API key from X-API-Key header
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      const result = await validateApiKey(apiKeyRepository, apiKey, fastify.log);
      if (result) {
        // Check if user is disabled or deleted
        const disabled = await isUserDisabled(fastify.prisma, result.userId);
        if (disabled === null) {
          throw new UnauthorizedError('User not found');
        }
        if (disabled) {
          throw new ForbiddenError('Account is disabled');
        }
        request.user = { userId: result.userId };
        return;
      }
      throw new UnauthorizedError('Invalid or revoked API key');
    }

    // Second, try impersonation token (takes priority over regular token)
    const impersonation = await tryImpersonationToken(request);
    if (impersonation) {
      // Check if impersonated user is disabled or deleted
      const disabled = await isUserDisabled(fastify.prisma, impersonation.userId);
      if (disabled === null) {
        throw new UnauthorizedError('User not found');
      }
      if (disabled) {
        throw new ForbiddenError('Account is disabled');
      }

      // Set user with impersonation context
      request.user = {
        userId: impersonation.userId,
        impersonatedBy: impersonation.impersonatedBy,
      };
      return;
    }

    // Third, try regular JWT from cookie
    try {
      await request.jwtVerify();

      // Check if user is disabled or deleted (before validating session)
      const disabled = await isUserDisabled(fastify.prisma, request.user.userId);
      if (disabled === null) {
        throw new UnauthorizedError('User not found');
      }
      if (disabled) {
        throw new ForbiddenError('Account is disabled');
      }

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
      if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
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
        const result = await validateApiKey(apiKeyRepository, apiKey, fastify.log);
        if (result) {
          // Check if user is disabled or deleted
          const disabled = await isUserDisabled(fastify.prisma, result.userId);
          if (disabled === null) {
            fastify.log.warn(
              { userId: result.userId },
              'Optional auth skipped: user not found (orphaned API key)'
            );
            return;
          }
          if (disabled) {
            fastify.log.info(
              { userId: result.userId },
              'Optional auth skipped: account is disabled (API key)'
            );
            return;
          }
          request.user = { userId: result.userId };
          return;
        }
      }

      // Try JWT
      try {
        await request.jwtVerify();

        // Check if user is disabled or deleted
        const disabled = await isUserDisabled(fastify.prisma, request.user.userId);
        if (disabled === null) {
          fastify.log.warn(
            { userId: request.user.userId },
            'Optional auth skipped: user not found (orphaned JWT)'
          );
          request.user = undefined as unknown as typeof request.user;
          return;
        }
        if (disabled) {
          fastify.log.info(
            { userId: request.user.userId },
            'Optional auth skipped: account is disabled (JWT)'
          );
          request.user = undefined as unknown as typeof request.user;
          return;
        }

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
