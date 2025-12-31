/**
 * WebAuthn Plugin
 *
 * Registers the WebAuthn service for Passkey authentication.
 */
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { WebAuthnService } from '../services/webauthn.service.js';

/**
 * Extend Fastify types with WebAuthn service
 */
declare module 'fastify' {
  interface FastifyInstance {
    webauthnService: WebAuthnService;
  }
}

const webauthnPlugin: FastifyPluginAsync = async (fastify) => {
  const webauthnService = new WebAuthnService(fastify.prisma);
  fastify.decorate('webauthnService', webauthnService);
};

export default fp(webauthnPlugin, {
  name: 'webauthn',
  dependencies: ['prisma'],
});
