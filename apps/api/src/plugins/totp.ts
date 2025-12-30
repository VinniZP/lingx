/**
 * TOTP Plugin
 *
 * Registers the TOTP service for Two-Factor Authentication.
 */
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { TotpService } from '../services/totp.service.js';

/**
 * Extend Fastify types with TOTP service
 */
declare module 'fastify' {
  interface FastifyInstance {
    totpService: TotpService;
  }
}

const totpPlugin: FastifyPluginAsync = async (fastify) => {
  const totpService = new TotpService(fastify.prisma);
  fastify.decorate('totpService', totpService);
};

export default fp(totpPlugin, {
  name: 'totp',
  dependencies: ['prisma'],
});
