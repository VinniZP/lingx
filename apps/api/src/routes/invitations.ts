/**
 * Invitation Routes
 *
 * Public routes for invitation acceptance.
 * GET is public (no auth), POST requires authentication.
 */

import { invitationDetailsResponseSchema } from '@lingx/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AcceptInvitationCommand, GetInvitationByTokenQuery } from '../modules/member/index.js';

const invitationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/invitations/:token - Get invitation details (public)
   *
   * Used by the invitation accept page to show project info before login.
   */
  app.get(
    '/api/invitations/:token',
    {
      schema: {
        description: 'Get invitation details by token (public endpoint for accept page)',
        tags: ['Invitations'],
        params: z.object({
          token: z.string(),
        }),
        response: {
          200: invitationDetailsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      return fastify.queryBus.execute(new GetInvitationByTokenQuery(request.params.token));
    }
  );

  /**
   * POST /api/invitations/:token/accept - Accept invitation (requires auth)
   */
  app.post(
    '/api/invitations/:token/accept',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Accept a project invitation (requires authentication)',
        tags: ['Invitations'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          token: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new AcceptInvitationCommand(request.params.token, request.user.userId)
      );
      return reply.status(204).send();
    }
  );
};

export default invitationRoutes;
