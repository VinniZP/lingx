/**
 * Security Routes
 *
 * Handles password changes and session management.
 * Uses CQRS-lite pattern - routes dispatch to command/query buses.
 */
import {
  changePasswordResponseSchema,
  changePasswordSchema,
  revokeAllSessionsResponseSchema,
  sessionListResponseSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ChangePasswordCommand,
  GetSessionsQuery,
  RevokeAllSessionsCommand,
  RevokeSessionCommand,
} from '../modules/security/index.js';
import { UnauthorizedError } from '../plugins/error-handler.js';
import { extractRequestMetadata } from '../services/security.service.js';

const securityRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * PUT /api/security/password
   *
   * Change the user's password.
   * Invalidates all other sessions after password change.
   */
  app.put(
    '/api/security/password',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Change password',
        tags: ['Security'],
        security: [{ bearerAuth: [] }],
        body: changePasswordSchema,
        response: {
          200: changePasswordResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body;
      const { userId, sessionId } = request.user;

      if (!sessionId) {
        throw new UnauthorizedError('Session ID is required');
      }

      // Extract metadata from request before creating command (decouples from framework)
      const metadata = extractRequestMetadata(request);

      // Dispatch to command bus
      const result = await fastify.commandBus.execute(
        new ChangePasswordCommand(userId, sessionId, currentPassword, newPassword, metadata)
      );

      // Issue new JWT with new session ID (HTTP-specific logic stays in route)
      const token = fastify.jwt.sign({ userId, sessionId: result.newSessionId });

      // Set new cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return { message: 'Password changed successfully. All other sessions have been revoked.' };
    }
  );

  /**
   * GET /api/security/sessions
   *
   * List all active sessions for the current user.
   */
  app.get(
    '/api/security/sessions',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List active sessions',
        tags: ['Security'],
        security: [{ bearerAuth: [] }],
        response: {
          200: sessionListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId, sessionId } = request.user;

      if (!sessionId) {
        throw new UnauthorizedError('Session ID is required');
      }

      // Dispatch to query bus
      const sessions = await fastify.queryBus.execute(new GetSessionsQuery(userId, sessionId));

      return { sessions };
    }
  );

  /**
   * DELETE /api/security/sessions/:id
   *
   * Revoke a specific session. Cannot revoke current session.
   */
  app.delete(
    '/api/security/sessions/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Revoke a specific session',
        tags: ['Security'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          204: z.void(),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { userId, sessionId } = request.user;

      if (!sessionId) {
        throw new UnauthorizedError('Session ID is required');
      }

      // Dispatch to command bus
      await fastify.commandBus.execute(new RevokeSessionCommand(userId, id, sessionId));

      return reply.status(204).send();
    }
  );

  /**
   * DELETE /api/security/sessions
   *
   * Revoke all sessions except the current one.
   */
  app.delete(
    '/api/security/sessions',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Revoke all other sessions',
        tags: ['Security'],
        security: [{ bearerAuth: [] }],
        response: {
          200: revokeAllSessionsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId, sessionId } = request.user;

      if (!sessionId) {
        throw new UnauthorizedError('Session ID is required');
      }

      // Dispatch to command bus
      const result = await fastify.commandBus.execute(
        new RevokeAllSessionsCommand(userId, sessionId)
      );

      return {
        message: `Revoked ${result.revokedCount} session${result.revokedCount !== 1 ? 's' : ''}`,
        revokedCount: result.revokedCount,
      };
    }
  );
};

export default securityRoutes;
