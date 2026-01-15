/**
 * Admin Routes
 *
 * Thin HTTP layer for admin user management operations.
 * All routes require ADMIN role authentication.
 *
 * Routes are scoped under /api/admin
 */

import {
  adminUserDetailsResponseSchema,
  adminUserListResponseSchema,
  listUsersQuerySchema,
} from '@lingx/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  DisableUserCommand,
  EnableUserCommand,
  GetUserActivityQuery,
  GetUserDetailsQuery,
  ImpersonateUserCommand,
  ListUsersQuery,
} from '../modules/admin/index.js';

/** Response schema for user activity */
const userActivityResponseSchema = z.object({
  activities: z.array(
    z.object({
      id: z.string(),
      projectId: z.string(),
      type: z.string(),
      metadata: z.unknown(),
      count: z.number(),
      createdAt: z.string(),
      project: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      }),
    })
  ),
});

/** Role types for admin responses */
type GlobalRole = 'ADMIN' | 'MANAGER' | 'DEVELOPER';
type ProjectRole = 'OWNER' | 'MANAGER' | 'DEVELOPER';

/** Transform user details to response DTO */
function toUserDetailsDto(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  isDisabled: boolean;
  disabledAt: Date | null;
  createdAt: Date;
  disabledBy: { id: string; name: string | null; email: string } | null;
  projectMembers: Array<{ role: string; project: { id: string; name: string; slug: string } }>;
  stats: { projectCount: number; lastActiveAt: Date | null };
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role as GlobalRole,
    isDisabled: user.isDisabled,
    disabledAt: user.disabledAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    disabledBy: user.disabledBy,
    projects: user.projectMembers.map((pm) => ({
      id: pm.project.id,
      name: pm.project.name,
      slug: pm.project.slug,
      role: pm.role as ProjectRole,
    })),
    stats: {
      projectCount: user.stats.projectCount,
      lastActiveAt: user.stats.lastActiveAt?.toISOString() ?? null,
    },
  };
}

/** Transform user list to response DTO */
function toUserListDto(result: {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    isDisabled: boolean;
    disabledAt: Date | null;
    createdAt: Date;
    _count: { projectMembers: number };
  }>;
  total: number;
  page: number;
  limit: number;
}) {
  return {
    users: result.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      role: u.role as GlobalRole,
      isDisabled: u.isDisabled,
      disabledAt: u.disabledAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      projectCount: u._count.projectMembers,
    })),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
}

/** Transform activity list to response DTO */
function toActivityListDto(
  activities: Array<{
    id: string;
    projectId: string;
    type: string;
    metadata: unknown;
    count: number;
    createdAt: Date;
    project: { id: string; name: string; slug: string };
  }>
) {
  return {
    activities: activities.map(({ createdAt, ...rest }) => ({
      ...rest,
      createdAt: createdAt.toISOString(),
    })),
  };
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/admin/users - List all users with filters and pagination
   */
  app.get(
    '/api/admin/users',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all users (ADMIN only)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        querystring: listUsersQuerySchema,
        response: {
          200: adminUserListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { page, limit, ...filters } = request.query;
      const result = await fastify.queryBus.execute(
        new ListUsersQuery(filters, { page, limit }, request.user.userId)
      );
      return toUserListDto(result);
    }
  );

  /**
   * GET /api/admin/users/:id - Get user details
   */
  app.get(
    '/api/admin/users/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get detailed user information (ADMIN only)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: adminUserDetailsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const result = await fastify.queryBus.execute(
        new GetUserDetailsQuery(request.params.id, request.user.userId)
      );
      return toUserDetailsDto(result);
    }
  );

  /**
   * GET /api/admin/users/:id/activity - Get user's recent activity
   */
  app.get(
    '/api/admin/users/:id/activity',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: "Get user's recent activity (ADMIN only)",
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).default(50),
        }),
        response: {
          200: userActivityResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const activities = await fastify.queryBus.execute(
        new GetUserActivityQuery(request.params.id, request.query.limit, request.user.userId)
      );
      return toActivityListDto(activities);
    }
  );

  /**
   * POST /api/admin/users/:id/disable - Disable a user account
   */
  app.post(
    '/api/admin/users/:id/disable',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Disable a user account (ADMIN only)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          204: z.null().describe('User disabled successfully'),
        },
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new DisableUserCommand(request.params.id, request.user.userId)
      );
      return reply.status(204).send();
    }
  );

  /**
   * POST /api/admin/users/:id/enable - Enable a disabled user account
   */
  app.post(
    '/api/admin/users/:id/enable',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Enable a disabled user account (ADMIN only)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          204: z.null().describe('User enabled successfully'),
        },
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new EnableUserCommand(request.params.id, request.user.userId)
      );
      return reply.status(204).send();
    }
  );

  /**
   * POST /api/admin/users/:id/impersonate - Start impersonation session
   *
   * Sets an impersonation token cookie (checked before regular auth token).
   * The admin's regular session remains intact - when impersonation expires
   * or is exited, they automatically fall back to their admin session.
   */
  app.post(
    '/api/admin/users/:id/impersonate',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Start a 1-hour impersonation session (ADMIN only)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            message: z.string(),
            expiresAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      // Handler validates permissions and returns data for JWT generation
      const result = await fastify.commandBus.execute(
        new ImpersonateUserCommand(request.params.id, request.user.userId)
      );

      // Generate impersonation JWT (checked before regular token by auth plugin)
      const impersonationToken = fastify.jwt.sign(
        {
          userId: result.targetUserId,
          impersonatedBy: result.actorId,
          purpose: 'impersonation',
        },
        { expiresIn: '1h' }
      );

      // Set impersonation token (httpOnly - auth plugin reads this)
      reply.setCookie('impersonation_token', impersonationToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 hour
      });

      // Set metadata for frontend banner display (NOT httpOnly, JS can read)
      const metadata = JSON.stringify({
        userName: result.targetUserName,
        userEmail: result.targetUserEmail,
        expiresAt: result.expiresAt,
      });
      reply.setCookie('impersonation_meta', metadata, {
        httpOnly: false, // JS needs to read this for banner
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 hour
      });

      return {
        message: 'Impersonation session started',
        expiresAt: result.expiresAt,
      };
    }
  );
};

export default adminRoutes;
