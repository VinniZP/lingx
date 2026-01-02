/**
 * WebAuthn Routes
 *
 * Handles Passkey registration, authentication, and management.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  webauthnRegisterOptionsResponseSchema,
  webauthnRegisterVerifySchema,
  webauthnAuthOptionsSchema,
  webauthnAuthOptionsResponseSchema,
  webauthnAuthVerifySchema,
  webauthnCredentialsResponseSchema,
  webauthnStatusResponseSchema,
  webauthnDeleteCredentialResponseSchema,
  webauthnGoPasswordlessResponseSchema,
  authResponseSchema,
} from '@lingx/shared';
import { UnauthorizedError } from '../plugins/error-handler.js';
import { toUserDto } from '../dto/user.dto.js';

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
  app.post('/api/webauthn/register/options', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Generate WebAuthn registration options',
      tags: ['WebAuthn'],
      security: [{ bearerAuth: [] }],
      response: {
        200: webauthnRegisterOptionsResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const { userId } = request.user;

    return fastify.webauthnService.generateRegistrationOptions(userId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sign: (payload, options) => fastify.jwt.sign(payload as any, options),
    });
  });

  /**
   * POST /api/webauthn/register/verify
   *
   * Verify registration response and store the new passkey.
   */
  app.post('/api/webauthn/register/verify', {
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
  }, async (request, _reply) => {
    const { userId } = request.user;
    const { name, challengeToken, response } = request.body;

    const credential = await fastify.webauthnService.verifyRegistration(
      userId,
      name,
      challengeToken,
      response,
      { verify: <T>(token: string) => fastify.jwt.verify(token) as T }
    );

    return { credential };
  });

  // ============================================
  // AUTHENTICATION FLOW
  // ============================================

  /**
   * POST /api/webauthn/authenticate/options
   *
   * Generate WebAuthn authentication options for signing in.
   * Does NOT require authentication (this is for login).
   */
  app.post('/api/webauthn/authenticate/options', {
    schema: {
      description: 'Generate WebAuthn authentication options',
      tags: ['WebAuthn'],
      body: webauthnAuthOptionsSchema,
      response: {
        200: webauthnAuthOptionsResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const { email } = request.body;

    return fastify.webauthnService.generateAuthenticationOptions(email, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sign: (payload, options) => fastify.jwt.sign(payload as any, options),
    });
  });

  /**
   * POST /api/webauthn/authenticate/verify
   *
   * Verify authentication response and issue JWT.
   * This is the passkey login endpoint.
   */
  app.post('/api/webauthn/authenticate/verify', {
    schema: {
      description: 'Verify WebAuthn authentication and login',
      tags: ['WebAuthn'],
      body: webauthnAuthVerifySchema,
      response: {
        200: authResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { challengeToken, response } = request.body;

    // Verify the passkey authentication
    const { userId } = await fastify.webauthnService.verifyAuthentication(
      challengeToken,
      response,
      { verify: <T>(token: string) => fastify.jwt.verify(token) as T }
    );

    // Create session
    const session = await fastify.securityService.createSession(userId, request);

    // Issue JWT
    const jwtToken = fastify.jwt.sign({ userId, sessionId: session.id });

    // Set cookie
    reply.setCookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Get user details
    const user = await fastify.authService.getUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return { user: toUserDto(user) };
  });

  // ============================================
  // CREDENTIAL MANAGEMENT
  // ============================================

  /**
   * GET /api/webauthn/credentials
   *
   * List all passkeys for the authenticated user.
   */
  app.get('/api/webauthn/credentials', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'List user passkeys',
      tags: ['WebAuthn'],
      security: [{ bearerAuth: [] }],
      response: {
        200: webauthnCredentialsResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const { userId } = request.user;
    const credentials = await fastify.webauthnService.listCredentials(userId);
    return { credentials };
  });

  /**
   * DELETE /api/webauthn/credentials/:id
   *
   * Delete a passkey.
   */
  app.delete('/api/webauthn/credentials/:id', {
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
  }, async (request, _reply) => {
    const { userId } = request.user;
    const { id } = request.params;

    const { remainingCount } = await fastify.webauthnService.deleteCredential(userId, id);

    return {
      message: 'Passkey deleted successfully',
      remainingCount,
    };
  });

  /**
   * GET /api/webauthn/status
   *
   * Get WebAuthn status for the authenticated user.
   */
  app.get('/api/webauthn/status', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get WebAuthn status',
      tags: ['WebAuthn'],
      security: [{ bearerAuth: [] }],
      response: {
        200: webauthnStatusResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const { userId } = request.user;
    return fastify.webauthnService.getStatus(userId);
  });

  // ============================================
  // PASSWORDLESS
  // ============================================

  /**
   * POST /api/webauthn/go-passwordless
   *
   * Remove password and go fully passwordless.
   * Requires at least 2 passkeys.
   */
  app.post('/api/webauthn/go-passwordless', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Go passwordless (remove password)',
      tags: ['WebAuthn'],
      security: [{ bearerAuth: [] }],
      response: {
        200: webauthnGoPasswordlessResponseSchema,
      },
    },
  }, async (request, _reply) => {
    const { userId } = request.user;
    await fastify.webauthnService.goPasswordless(userId);
    return { message: 'You are now passwordless! Use your passkeys to sign in.' };
  });
};

export default webauthnRoutes;
