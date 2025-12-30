/**
 * Profile Plugin
 *
 * Registers profile-related services:
 * - EmailService for sending verification emails
 * - FileStorageService for avatar uploads
 * - ProfileService for profile operations
 */
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { EmailService } from '../services/email.service.js';
import { FileStorageService } from '../services/file-storage.service.js';
import { ProfileService } from '../services/profile.service.js';

/**
 * Extend Fastify types with profile services
 */
declare module 'fastify' {
  interface FastifyInstance {
    emailService: EmailService;
    fileStorageService: FileStorageService;
    profileService: ProfileService;
  }
}

const profilePlugin: FastifyPluginAsync = async (fastify) => {
  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
      files: 1,
    },
  });

  // Create services
  const emailService = new EmailService();
  const fileStorageService = new FileStorageService();

  // Initialize file storage (create directories)
  await fileStorageService.init();

  const profileService = new ProfileService(
    fastify.prisma,
    emailService,
    fileStorageService
  );

  // Decorate fastify instance with services
  fastify.decorate('emailService', emailService);
  fastify.decorate('fileStorageService', fileStorageService);
  fastify.decorate('profileService', profileService);

  // Register static file serving for uploads
  const uploadDir = fileStorageService.getUploadDir();
  const absoluteUploadDir = path.isAbsolute(uploadDir)
    ? uploadDir
    : path.resolve(process.cwd(), uploadDir);

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  await fastify.register(fastifyStatic, {
    root: absoluteUploadDir,
    prefix: '/uploads/',
    decorateReply: false, // Don't override reply.sendFile if already decorated
    setHeaders: (res) => {
      // Add CORS headers for static files
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
};

export default fp(profilePlugin, {
  name: 'profile',
  dependencies: ['prisma'],
});
