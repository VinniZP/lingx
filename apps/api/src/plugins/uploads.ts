/**
 * Uploads Plugin
 *
 * Serves static files from the uploads directory (avatars, etc.)
 */
import fastifyStatic from '@fastify/static';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';

const uploadsPlugin: FastifyPluginAsync = async (fastify) => {
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
