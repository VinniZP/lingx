/**
 * Profile Routes
 *
 * Handles user profile operations:
 * - Profile management (name, avatar)
 * - User preferences
 * - Email change with verification
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  updateProfileSchema,
  updatePreferencesSchema,
  changeEmailSchema,
  verifyEmailSchema,
  userProfileResponseSchema,
  userPreferencesSchema,
  avatarResponseSchema,
  messageResponseSchema,
} from '@lingx/shared';
import { ValidationError } from '../plugins/error-handler.js';

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // Profile Operations
  // ============================================

  /**
   * GET /api/profile
   *
   * Get current user's profile with preferences
   */
  app.get(
    '/api/profile',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get current user profile',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        response: {
          200: userProfileResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = await fastify.profileService.getProfile(request.user.userId);

      return reply.send({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
      });
    }
  );

  /**
   * PUT /api/profile
   *
   * Update profile (name only)
   */
  app.put(
    '/api/profile',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update user profile',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        body: updateProfileSchema,
        response: {
          200: userProfileResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = await fastify.profileService.updateProfile(
        request.user.userId,
        request.body
      );

      return reply.send({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
      });
    }
  );

  // ============================================
  // Avatar Operations
  // ============================================

  /**
   * POST /api/profile/avatar
   *
   * Upload user avatar (multipart/form-data)
   */
  app.post(
    '/api/profile/avatar',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Upload user avatar',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          200: avatarResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        throw new ValidationError('No file uploaded');
      }

      const result = await fastify.profileService.updateAvatar(
        request.user.userId,
        data
      );

      return reply.send(result);
    }
  );

  /**
   * DELETE /api/profile/avatar
   *
   * Remove user avatar
   */
  app.delete(
    '/api/profile/avatar',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Remove user avatar',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        response: {
          200: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await fastify.profileService.deleteAvatar(request.user.userId);
      return reply.send({ message: 'Avatar removed successfully' });
    }
  );

  // ============================================
  // Preferences Operations
  // ============================================

  /**
   * PUT /api/profile/preferences
   *
   * Update user preferences (theme, language, notifications, etc.)
   */
  app.put(
    '/api/profile/preferences',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update user preferences',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        body: updatePreferencesSchema,
        response: {
          200: userPreferencesSchema,
        },
      },
    },
    async (request, reply) => {
      const preferences = await fastify.profileService.updatePreferences(
        request.user.userId,
        request.body
      );

      return reply.send(preferences);
    }
  );

  // ============================================
  // Email Change Operations
  // ============================================

  /**
   * POST /api/profile/email/change
   *
   * Initiate email change - sends verification to new email
   */
  app.post(
    '/api/profile/email/change',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Initiate email change',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        body: changeEmailSchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await fastify.profileService.initiateEmailChange(
        request.user.userId,
        request.body
      );

      return reply.send({
        message: 'Verification email sent. Please check your new email address.',
      });
    }
  );

  /**
   * POST /api/profile/email/verify
   *
   * Verify email change with token (from email link)
   */
  app.post(
    '/api/profile/email/verify',
    {
      schema: {
        description: 'Verify email change',
        tags: ['Profile'],
        body: verifyEmailSchema,
        response: {
          200: userProfileResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = await fastify.profileService.verifyEmailChange(
        request.body.token
      );

      return reply.send({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
      });
    }
  );

  /**
   * DELETE /api/profile/email/cancel
   *
   * Cancel pending email change
   */
  app.delete(
    '/api/profile/email/cancel',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Cancel pending email change',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        response: {
          200: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await fastify.profileService.cancelEmailChange(request.user.userId);
      return reply.send({ message: 'Email change cancelled' });
    }
  );
};

export default profileRoutes;
