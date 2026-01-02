/**
 * Security Routes
 *
 * Handles password changes and session management.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  changePasswordSchema,
  changePasswordResponseSchema,
  sessionListResponseSchema,
  revokeAllSessionsResponseSchema,
} from '@lingx/shared';

const securityRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * PUT /api/security/password
   *
   * Change the user's password.
   * Invalidates all other sessions after password change.
   */
  app.put('/api/security/password', {
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
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body;
    const { userId, sessionId } = request.user;

    // Change password - this revokes all sessions and creates a new one
    const result = await fastify.securityService.changePassword(
      userId,
      sessionId || '',
      { currentPassword, newPassword },
      request
    );

    // Issue new JWT with new session ID
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
  });

  /**
   * GET /api/security/sessions
   *
   * List all active sessions for the current user.
   */
  app.get('/api/security/sessions', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'List active sessions',
      tags: ['Security'],
      security: [{ bearerAuth: [] }],
      response: {
        200: sessionListResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const { userId, sessionId } = request.user;

    const sessions = await fastify.securityService.getSessions(
      userId,
      sessionId || ''
    );

    return { sessions };
  });

  /**
   * DELETE /api/security/sessions/:id
   *
   * Revoke a specific session. Cannot revoke current session.
   */
  app.delete('/api/security/sessions/:id', {
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
  }, async (request, reply) => {
    const { id } = request.params;
    const { userId, sessionId } = request.user;

    await fastify.securityService.revokeSession(
      userId,
      id,
      sessionId || ''
    );

    return reply.status(204).send();
  });

  /**
   * DELETE /api/security/sessions
   *
   * Revoke all sessions except the current one.
   */
  app.delete('/api/security/sessions', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Revoke all other sessions',
      tags: ['Security'],
      security: [{ bearerAuth: [] }],
      response: {
        200: revokeAllSessionsResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const { userId, sessionId } = request.user;

    const revokedCount = await fastify.securityService.revokeAllOtherSessions(
      userId,
      sessionId || ''
    );

    return {
      message: `Revoked ${revokedCount} session${revokedCount !== 1 ? 's' : ''}`,
      revokedCount,
    };
  });
};

export default securityRoutes;
