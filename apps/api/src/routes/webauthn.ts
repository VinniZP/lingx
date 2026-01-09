/**
 * WebAuthn Routes
 *
 * Handles Passkey registration, authentication, and management.
 * Uses CQRS command/query buses for business logic.
 */
import {
  authResponseSchema,
  webauthnAuthOptionsResponseSchema,
  webauthnAuthOptionsSchema,
  webauthnAuthVerifySchema,
  webauthnCredentialsResponseSchema,
  webauthnDeleteCredentialResponseSchema,
  webauthnGoPasswordlessResponseSchema,
  webauthnRegisterOptionsResponseSchema,
  webauthnRegisterVerifySchema,
  webauthnStatusResponseSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { toUserDto } from '../dto/user.dto.js';
import { BadRequestError, UnauthorizedError } from '../plugins/error-handler.js';

// Import commands and queries from MFA module
import {
  DeleteCredentialCommand,
  GenerateAuthenticationOptionsCommand,
  GenerateRegistrationOptionsCommand,
  GetWebAuthnCredentialsQuery,
  GetWebAuthnStatusQuery,
  GoPasswordlessCommand,
  VerifyAuthenticationCommand,
  VerifyRegistrationCommand,
} from '../modules/mfa/index.js';

const webauthnRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // REGISTRATION FLOW
  // ============================================

  /**
   * POST /api/webauthn/register/options
   *
   * Generate WebAuthn registration options for creating a new passkey.
   * Requires authentication.
   */
  app.post(
    '/api/webauthn/register/options',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Generate WebAuthn registration options',
        tags: ['WebAuthn'],
        security: [{ bearerAuth: [] }],
        response: {
          200: webauthnRegisterOptionsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;

      // Get registration options from command
      const result = await fastify.commandBus.execute(
        new GenerateRegistrationOptionsCommand(userId)
      );

      // Create challenge token (HTTP concern - stays in route)
      const challengeToken = fastify.jwt.sign(
        { challenge: result.challenge, userId, purpose: 'webauthn-register' },
        { expiresIn: '5m' }
      );

      return { options: result.options, challengeToken };
    }
  );

  /**
   * POST /api/webauthn/register/verify
   *
   * Verify registration response and store the new passkey.
   */
  app.post(
    '/api/webauthn/register/verify',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Verify WebAuthn registration and store passkey',
        tags: ['WebAuthn'],
        security: [{ bearerAuth: [] }],
        body: webauthnRegisterVerifySchema,
        response: {
          200: z.object({
            credential: z.object({
              id: z.string(),
              name: z.string(),
              createdAt: z.string(),
              lastUsedAt: z.string().nullable(),
              deviceType: z.string(),
              backedUp: z.boolean(),
            }),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      const { name, challengeToken, response } = request.body;

      // Verify challenge token (HTTP concern - stays in route)
      let payload: { challenge: string; userId: string; purpose: string };
      try {
        payload = fastify.jwt.verify(challengeToken) as typeof payload;
      } catch (err) {
        fastify.log.debug({ err }, 'WebAuthn registration challenge token verification failed');
        throw new BadRequestError('Invalid or expired challenge token');
      }

      if (payload.purpose !== 'webauthn-register' || payload.userId !== userId) {
        fastify.log.warn(
          { purpose: payload.purpose, userId, tokenUserId: payload.userId },
          'WebAuthn challenge token purpose/user mismatch'
        );
        throw new BadRequestError('Invalid challenge token');
      }

      // Verify registration (business logic - dispatch to command)
      const result = await fastify.commandBus.execute(
        new VerifyRegistrationCommand(userId, name, payload.challenge, response)
      );

      return { credential: { ...result.credential, lastUsedAt: null } };
    }
  );

  // ============================================
  // AUTHENTICATION FLOW
  // ============================================

  /**
   * POST /api/webauthn/authenticate/options
   *
   * Generate WebAuthn authentication options for signing in.
   * Does NOT require authentication (this is for login).
   */
  app.post(
    '/api/webauthn/authenticate/options',
    {
      schema: {
        description: 'Generate WebAuthn authentication options',
        tags: ['WebAuthn'],
        body: webauthnAuthOptionsSchema,
        response: {
          200: webauthnAuthOptionsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { email } = request.body;

      // Get authentication options from command
      const result = await fastify.commandBus.execute(
        new GenerateAuthenticationOptionsCommand(email)
      );

      // Create challenge token (HTTP concern - stays in route)
      const challengeToken = fastify.jwt.sign(
        { challenge: result.challenge, userId: result.userId, purpose: 'webauthn-auth' },
        { expiresIn: '5m' }
      );

      return { options: result.options, challengeToken };
    }
  );

  /**
   * POST /api/webauthn/authenticate/verify
   *
   * Verify authentication response and issue JWT.
   * This is the passkey login endpoint.
   */
  app.post(
    '/api/webauthn/authenticate/verify',
    {
      schema: {
        description: 'Verify WebAuthn authentication and login',
        tags: ['WebAuthn'],
        body: webauthnAuthVerifySchema,
        response: {
          200: authResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { challengeToken, response } = request.body;

      // Verify challenge token (HTTP concern - stays in route)
      let payload: { challenge: string; userId?: string; purpose: string };
      try {
        payload = fastify.jwt.verify(challengeToken) as typeof payload;
      } catch (err) {
        fastify.log.debug({ err }, 'WebAuthn authentication challenge token verification failed');
        throw new BadRequestError('Invalid or expired challenge token');
      }

      if (payload.purpose !== 'webauthn-auth') {
        fastify.log.warn({ purpose: payload.purpose }, 'WebAuthn challenge token purpose mismatch');
        throw new BadRequestError('Invalid challenge token');
      }

      // Verify the passkey authentication (business logic - dispatch to command)
      const result = await fastify.commandBus.execute(
        new VerifyAuthenticationCommand(payload.challenge, response)
      );

      // Create session (HTTP concern - stays in route)
      const session = await fastify.securityService.createSession(result.userId, request);

      // Issue JWT
      const jwtToken = fastify.jwt.sign({ userId: result.userId, sessionId: session.id });

      // Set cookie
      reply.setCookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      // Get user details
      const user = await fastify.authService.getUserById(result.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return { user: toUserDto(user) };
    }
  );

  // ============================================
  // CREDENTIAL MANAGEMENT
  // ============================================

  /**
   * GET /api/webauthn/credentials
   *
   * List all passkeys for the authenticated user.
   */
  app.get(
    '/api/webauthn/credentials',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List user passkeys',
        tags: ['WebAuthn'],
        security: [{ bearerAuth: [] }],
        response: {
          200: webauthnCredentialsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      const result = await fastify.queryBus.execute(new GetWebAuthnCredentialsQuery(userId));
      return { credentials: result.credentials };
    }
  );

  /**
   * DELETE /api/webauthn/credentials/:id
   *
   * Delete a passkey.
   */
  app.delete(
    '/api/webauthn/credentials/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete a passkey',
        tags: ['WebAuthn'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: webauthnDeleteCredentialResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const result = await fastify.commandBus.execute(new DeleteCredentialCommand(userId, id));

      return {
        message: 'Passkey deleted successfully',
        remainingCount: result.remainingCount,
      };
    }
  );

  /**
   * GET /api/webauthn/status
   *
   * Get WebAuthn status for the authenticated user.
   */
  app.get(
    '/api/webauthn/status',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get WebAuthn status',
        tags: ['WebAuthn'],
        security: [{ bearerAuth: [] }],
        response: {
          200: webauthnStatusResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      return fastify.queryBus.execute(new GetWebAuthnStatusQuery(userId));
    }
  );

  // ============================================
  // PASSWORDLESS
  // ============================================

  /**
   * POST /api/webauthn/go-passwordless
   *
   * Remove password and go fully passwordless.
   * Requires at least 2 passkeys.
   */
  app.post(
    '/api/webauthn/go-passwordless',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Go passwordless (remove password)',
        tags: ['WebAuthn'],
        security: [{ bearerAuth: [] }],
        response: {
          200: webauthnGoPasswordlessResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { userId } = request.user;
      await fastify.commandBus.execute(new GoPasswordlessCommand(userId));
      return { message: 'You are now passwordless! Use your passkeys to sign in.' };
    }
  );
};

export default webauthnRoutes;
