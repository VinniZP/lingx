import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '../lib/prisma.js';

/**
 * Prisma Plugin for Fastify
 *
 * Decorates the Fastify instance with the Prisma client,
 * making it available via `fastify.prisma` in routes and handlers.
 *
 * Uses the singleton PrismaClient from src/lib/prisma.ts to ensure
 * consistent connection pooling across the application.
 */
const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate fastify instance with prisma
  fastify.decorate('prisma', prisma);

  // Graceful shutdown
  fastify.addHook('onClose', async (_instance) => {
    await prisma.$disconnect();
  });

  fastify.log.info('Prisma client registered');
};

export default fp(prismaPlugin, {
  name: 'prisma',
});
