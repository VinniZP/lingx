/**
 * Uploads Plugin
 *
 * Handles file uploads and serves static files from the uploads directory.
 * - Registers @fastify/multipart for file upload parsing
 * - Serves uploaded files (avatars, etc.) from /uploads/
 */
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';

const uploadsPlugin: FastifyPluginAsync = async (fastify) => {
  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
      files: 1,
    },
  });

  // Serve uploaded files
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const absoluteUploadDir = path.isAbsolute(uploadDir)
    ? uploadDir
    : path.resolve(process.cwd(), uploadDir);

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  await fastify.register(fastifyStatic, {
    root: absoluteUploadDir,
    prefix: '/uploads/',
    decorateReply: false,
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
};

export default fp(uploadsPlugin, {
  name: 'uploads',
});
