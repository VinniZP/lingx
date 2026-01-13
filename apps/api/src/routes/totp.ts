/**
 * TOTP Routes
 *
 * Handles Two-Factor Authentication setup, verification, and management.
 * Uses CQRS command/query buses for business logic.
 */
import {
  backupCodeVerifySchema,
  regenerateBackupCodesSchema,
  totpConfirmResponseSchema,
  totpConfirmSchema,
  totpDisableSchema,
  totpSetupResponseSchema,
  totpStatusSchema,
  totpVerifySchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UnauthorizedError } from '../plugins/error-handler.js';

// Import commands and queries from MFA module
import { GetCurrentUserQuery } from '../modules/auth/index.js';
import {
  CancelTotpSetupCommand,
  ConfirmTotpSetupCommand,
  DisableTotpCommand,
  GetTotpStatusQuery,
  InitiateTotpSetupCommand,
  RegenerateBackupCodesCommand,
  RevokeTrustCommand,
  VerifyBackupCodeCommand,
  VerifyTotpCommand,
} from '../modules/mfa/index.js';
import { CreateSessionCommand } from '../modules/security/commands/create-session.command.js';
import { extractRequestMetadata } from '../modules/security/utils.js';

const totpRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // SETUP FLOW
  // ============================================

  /**
   * POST /api/totp/setup
   *
   * Initiate TOTP setup - generates secret and backup codes.
   * Does NOT enable 2FA yet - user must verify with /setup/confirm.
   */
  app.post(
    '/api/totp/setup',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Initiate TOTP setup',
        tags: ['TOTP'],
        security: [{ bearerAuth: [] }],
        response: {
          200: totpSetupResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      return fastify.commandBus.execute(new InitiateTotpSetupCommand(userId));
    }
  );

  /**
   * POST /api/totp/setup/confirm
   *
   * Verify TOTP token to complete setup and enable 2FA.
   */
  app.post(
    '/api/totp/setup/confirm',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Confirm TOTP setup with verification code',
        tags: ['TOTP'],
        security: [{ bearerAuth: [] }],
        body: totpConfirmSchema,
        response: {
          200: totpConfirmResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      const { token } = request.body;
      return fastify.commandBus.execute(new ConfirmTotpSetupCommand(userId, token));
    }
  );

  /**
   * DELETE /api/totp/setup
   *
   * Cancel pending TOTP setup.
   */
  app.delete(
    '/api/totp/setup',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Cancel pending TOTP setup',
        tags: ['TOTP'],
        security: [{ bearerAuth: [] }],
        response: {
          204: z.void(),
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.user;
      await fastify.commandBus.execute(new CancelTotpSetupCommand(userId));
      return reply.status(204).send();
    }
  );

  // ============================================
  // LOGIN VERIFICATION
  // ============================================

  /**
   * POST /api/totp/verify
   *
   * Verify TOTP token during login. Uses tempToken from login response.
   * On success, issues full JWT and optionally trusts device.
   */
  app.post(
    '/api/totp/verify',
    {
      schema: {
        description: 'Verify TOTP token during login',
        tags: ['TOTP'],
        body: totpVerifySchema,
        response: {
          200: z.object({
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string().nullable(),
              role: z.string(),
              avatarUrl: z.string().nullable(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { tempToken, token, trustDevice } = request.body;

      // Verify temp token (HTTP concern - stays in route)
      let payload: { userId: string; purpose: string };
      try {
        payload = fastify.jwt.verify(tempToken) as { userId: string; purpose: string };
      } catch (err) {
        fastify.log.debug({ err }, 'TOTP temp token verification failed');
        throw new UnauthorizedError('Invalid or expired verification token');
      }

      if (payload.purpose !== '2fa') {
        throw new UnauthorizedError('Invalid token purpose');
      }

      const { userId } = payload;

      // Create session (HTTP concern - stays in route)
      const { userAgent, ipAddress } = extractRequestMetadata(request);
      const session = await fastify.commandBus.execute(
        new CreateSessionCommand(userId, userAgent, ipAddress)
      );

      // Verify TOTP (business logic - dispatch to command)
      await fastify.commandBus.execute(
        new VerifyTotpCommand(userId, token, session.id, trustDevice)
      );

      // Issue full JWT (HTTP concern - stays in route)
      const jwtToken = fastify.jwt.sign({ userId, sessionId: session.id });

      // Set cookie
      reply.setCookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      // Get user details via query bus
      const user = await fastify.queryBus.execute(new GetCurrentUserQuery(userId));

      return { user };
    }
  );

  /**
   * POST /api/totp/verify/backup
   *
   * Use backup code during login. Uses tempToken from login response.
   */
  app.post(
    '/api/totp/verify/backup',
    {
      schema: {
        description: 'Use backup code during login',
        tags: ['TOTP'],
        body: backupCodeVerifySchema,
        response: {
          200: z.object({
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string().nullable(),
              role: z.string(),
              avatarUrl: z.string().nullable(),
            }),
            codesRemaining: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { tempToken, code, trustDevice } = request.body;

      // Verify temp token (HTTP concern)
      let payload: { userId: string; purpose: string };
      try {
        payload = fastify.jwt.verify(tempToken) as { userId: string; purpose: string };
      } catch (err) {
        fastify.log.debug({ err }, 'Backup code temp token verification failed');
        throw new UnauthorizedError('Invalid or expired verification token');
      }

      if (payload.purpose !== '2fa') {
        throw new UnauthorizedError('Invalid token purpose');
      }

      const { userId } = payload;

      // Create session (HTTP concern)
      const { userAgent, ipAddress } = extractRequestMetadata(request);
      const session = await fastify.commandBus.execute(
        new CreateSessionCommand(userId, userAgent, ipAddress)
      );

      // Verify backup code (business logic - dispatch to command)
      const result = await fastify.commandBus.execute(
        new VerifyBackupCodeCommand(userId, code, session.id, trustDevice)
      );

      // Issue full JWT (HTTP concern)
      const jwtToken = fastify.jwt.sign({ userId, sessionId: session.id });

      // Set cookie
      reply.setCookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      // Get user details via query bus
      const user = await fastify.queryBus.execute(new GetCurrentUserQuery(userId));

      return { user, codesRemaining: result.remainingCodes };
    }
  );

  // ============================================
  // MANAGEMENT
  // ============================================

  /**
   * DELETE /api/totp
   *
   * Disable TOTP. Requires password confirmation.
   */
  app.delete(
    '/api/totp',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Disable TOTP',
        tags: ['TOTP'],
        security: [{ bearerAuth: [] }],
        body: totpDisableSchema,
        response: {
          204: z.void(),
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.user;
      const { password } = request.body;
      await fastify.commandBus.execute(new DisableTotpCommand(userId, password));
      return reply.status(204).send();
    }
  );

  /**
   * POST /api/totp/backup-codes
   *
   * Regenerate backup codes. Requires password confirmation.
   */
  app.post(
    '/api/totp/backup-codes',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Regenerate backup codes',
        tags: ['TOTP'],
        security: [{ bearerAuth: [] }],
        body: regenerateBackupCodesSchema,
        response: {
          200: z.object({
            backupCodes: z.array(z.string()),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      const { password } = request.body;
      const result = await fastify.commandBus.execute(
        new RegenerateBackupCodesCommand(userId, password)
      );
      return { backupCodes: result.codes };
    }
  );

  /**
   * GET /api/totp/status
   *
   * Get TOTP status including backup codes remaining.
   */
  app.get(
    '/api/totp/status',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get TOTP status',
        tags: ['TOTP'],
        security: [{ bearerAuth: [] }],
        response: {
          200: totpStatusSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      return fastify.queryBus.execute(new GetTotpStatusQuery(userId));
    }
  );

  /**
   * DELETE /api/totp/trust/:sessionId
   *
   * Revoke device trust for a specific session.
   */
  app.delete(
    '/api/totp/trust/:sessionId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Revoke device trust',
        tags: ['TOTP'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string(),
        }),
        response: {
          204: z.void(),
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.user;
      const { sessionId } = request.params;
      await fastify.commandBus.execute(new RevokeTrustCommand(sessionId, userId));
      return reply.status(204).send();
    }
  );
};

export default totpRoutes;
