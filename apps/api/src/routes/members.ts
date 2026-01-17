/**
 * Member Routes
 *
 * Thin HTTP layer for project member operations.
 * Routes validate input, dispatch to CQRS buses, and return DTOs.
 *
 * All routes are scoped under /api/projects/:projectId
 */

import {
  inviteMemberResultResponseSchema,
  inviteMemberSchema,
  projectInvitationListResponseSchema,
  projectMemberListResponseSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
} from '@lingx/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { toInvitationListDto, toMemberListDto } from '../dto/index.js';
import {
  InviteMemberCommand,
  LeaveProjectCommand,
  ListProjectInvitationsQuery,
  ListProjectMembersQuery,
  RemoveMemberCommand,
  RevokeInvitationCommand,
  TransferOwnershipCommand,
  UpdateMemberRoleCommand,
} from '../modules/member/index.js';

const memberRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/projects/:projectId/members - List project members
   */
  app.get(
    '/api/projects/:projectId/members',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all members of a project',
        tags: ['Members'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: projectMemberListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const members = await fastify.queryBus.execute(
        new ListProjectMembersQuery(request.params.projectId, request.user.userId)
      );
      return { members: toMemberListDto(members) };
    }
  );

  /**
   * GET /api/projects/:projectId/invitations - List pending invitations
   */
  app.get(
    '/api/projects/:projectId/invitations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List pending invitations for a project (MANAGER+ only)',
        tags: ['Members'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: projectInvitationListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const invitations = await fastify.queryBus.execute(
        new ListProjectInvitationsQuery(request.params.projectId, request.user.userId)
      );
      return { invitations: toInvitationListDto(invitations) };
    }
  );

  /**
   * POST /api/projects/:projectId/invitations - Invite members
   */
  app.post(
    '/api/projects/:projectId/invitations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Invite members to a project (MANAGER+ only)',
        tags: ['Members'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: inviteMemberSchema,
        response: {
          200: inviteMemberResultResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const result = await fastify.commandBus.execute(
        new InviteMemberCommand(
          request.params.projectId,
          request.body.emails,
          request.body.role,
          request.user.userId
        )
      );
      return result;
    }
  );

  /**
   * DELETE /api/projects/:projectId/invitations/:invitationId - Revoke invitation
   */
  app.delete(
    '/api/projects/:projectId/invitations/:invitationId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Revoke a pending invitation (MANAGER+ only)',
        tags: ['Members'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
          invitationId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new RevokeInvitationCommand(
          request.params.invitationId,
          request.params.projectId,
          request.user.userId
        )
      );
      return reply.status(204).send();
    }
  );

  /**
   * PATCH /api/projects/:projectId/members/:userId/role - Update member role
   */
  app.patch(
    '/api/projects/:projectId/members/:userId/role',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: "Update a member's role (MANAGER+ only)",
        tags: ['Members'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
          userId: z.string(),
        }),
        body: updateMemberRoleSchema,
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new UpdateMemberRoleCommand(
          request.params.projectId,
          request.params.userId,
          request.body.role,
          request.user.userId
        )
      );
      return reply.status(204).send();
    }
  );

  /**
   * DELETE /api/projects/:projectId/members/:userId - Remove member
   */
  app.delete(
    '/api/projects/:projectId/members/:userId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Remove a member from the project (OWNER only)',
        tags: ['Members'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
          userId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new RemoveMemberCommand(
          request.params.projectId,
          request.params.userId,
          request.user.userId
        )
      );
      return reply.status(204).send();
    }
  );

  /**
   * POST /api/projects/:projectId/leave - Leave project
   */
  app.post(
    '/api/projects/:projectId/leave',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Leave a project (cannot leave if sole OWNER)',
        tags: ['Members'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new LeaveProjectCommand(request.params.projectId, request.user.userId)
      );
      return reply.status(204).send();
    }
  );

  /**
   * POST /api/projects/:projectId/transfer-ownership - Transfer ownership
   */
  app.post(
    '/api/projects/:projectId/transfer-ownership',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Transfer ownership to another member (OWNER only)',
        tags: ['Members'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: transferOwnershipSchema,
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new TransferOwnershipCommand(
          request.params.projectId,
          request.body.newOwnerId,
          request.user.userId,
          request.body.keepOwnership
        )
      );
      return reply.status(204).send();
    }
  );
};

export default memberRoutes;
