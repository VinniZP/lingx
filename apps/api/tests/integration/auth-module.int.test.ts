/**
 * Auth Module Integration Tests
 *
 * Tests the CQRS flow from command/query bus through handlers to services.
 * Verifies module registration and event publishing.
 */
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { CreateApiKeyCommand } from '../../src/modules/auth/commands/create-api-key.command.js';
import { CreateApiKeyHandler } from '../../src/modules/auth/commands/create-api-key.handler.js';
import { LoginUserCommand } from '../../src/modules/auth/commands/login-user.command.js';
import { LoginUserHandler } from '../../src/modules/auth/commands/login-user.handler.js';
import { LogoutUserCommand } from '../../src/modules/auth/commands/logout-user.command.js';
import { LogoutUserHandler } from '../../src/modules/auth/commands/logout-user.handler.js';
import { RegisterUserCommand } from '../../src/modules/auth/commands/register-user.command.js';
import { RegisterUserHandler } from '../../src/modules/auth/commands/register-user.handler.js';
import { RevokeApiKeyCommand } from '../../src/modules/auth/commands/revoke-api-key.command.js';
import { RevokeApiKeyHandler } from '../../src/modules/auth/commands/revoke-api-key.handler.js';
import { AuthActivityHandler } from '../../src/modules/auth/handlers/auth-activity.handler.js';
import { GetCurrentUserHandler } from '../../src/modules/auth/queries/get-current-user.handler.js';
import { GetCurrentUserQuery } from '../../src/modules/auth/queries/get-current-user.query.js';
import { ListApiKeysHandler } from '../../src/modules/auth/queries/list-api-keys.handler.js';
import { ListApiKeysQuery } from '../../src/modules/auth/queries/list-api-keys.query.js';
import type { Cradle } from '../../src/shared/container/index.js';

describe('Auth Module Integration', () => {
  let app: FastifyInstance;
  let container: AwilixContainer<Cradle>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    container = app.container;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await app.prisma.auditLog.deleteMany({});
    await app.prisma.apiKey.deleteMany({});
    await app.prisma.session.deleteMany({});
    await app.prisma.projectMember.deleteMany({});
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'cqrs-test' } },
    });
  });

  describe('Handler Registration', () => {
    it('should register all command handlers in container', () => {
      // Verify command handlers are resolvable
      const registerHandler = container.resolve('registerUserHandler');
      const loginHandler = container.resolve('loginUserHandler');
      const logoutHandler = container.resolve('logoutUserHandler');
      const createApiKeyHandler = container.resolve('createApiKeyHandler');
      const revokeApiKeyHandler = container.resolve('revokeApiKeyHandler');

      expect(registerHandler).toBeInstanceOf(RegisterUserHandler);
      expect(loginHandler).toBeInstanceOf(LoginUserHandler);
      expect(logoutHandler).toBeInstanceOf(LogoutUserHandler);
      expect(createApiKeyHandler).toBeInstanceOf(CreateApiKeyHandler);
      expect(revokeApiKeyHandler).toBeInstanceOf(RevokeApiKeyHandler);
    });

    it('should register all query handlers in container', () => {
      const getCurrentUserHandler = container.resolve('getCurrentUserHandler');
      const listApiKeysHandler = container.resolve('listApiKeysHandler');

      expect(getCurrentUserHandler).toBeInstanceOf(GetCurrentUserHandler);
      expect(listApiKeysHandler).toBeInstanceOf(ListApiKeysHandler);
    });

    it('should register event handler in container', () => {
      const authActivityHandler = container.resolve('authActivityHandler');

      expect(authActivityHandler).toBeInstanceOf(AuthActivityHandler);
    });
  });

  describe('Command Bus Flow', () => {
    it('should execute RegisterUserCommand through command bus', async () => {
      const result = await app.commandBus.execute(
        new RegisterUserCommand('cqrs-test@example.com', 'SecurePass123!', 'CQRS Test User')
      );

      expect(result).toMatchObject({
        email: 'cqrs-test@example.com',
        name: 'CQRS Test User',
      });
      expect(result.id).toBeDefined();

      // Verify user was created in database
      const dbUser = await app.prisma.user.findUnique({
        where: { email: 'cqrs-test@example.com' },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.name).toBe('CQRS Test User');
    });

    it('should execute LoginUserCommand through command bus', async () => {
      // First register a user
      await app.commandBus.execute(
        new RegisterUserCommand('cqrs-login-test@example.com', 'SecurePass123!')
      );

      // Mock request object
      const mockRequest = {
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      };

      const result = await app.commandBus.execute(
        new LoginUserCommand(
          'cqrs-login-test@example.com',
          'SecurePass123!',
          mockRequest as Parameters<typeof LoginUserCommand.prototype.request>[0],
          false
        )
      );

      // Should return user and sessionId (not 2FA required)
      expect('user' in result).toBe(true);
      expect('sessionId' in result).toBe(true);
      if ('user' in result) {
        expect(result.user.email).toBe('cqrs-login-test@example.com');
        expect(result.sessionId).toBeDefined();

        // Verify session was created in database
        const dbSession = await app.prisma.session.findUnique({
          where: { id: result.sessionId },
        });
        expect(dbSession).not.toBeNull();
      }
    });

    it('should execute LogoutUserCommand through command bus', async () => {
      // Register and login to get a session
      await app.commandBus.execute(
        new RegisterUserCommand('cqrs-logout-test@example.com', 'SecurePass123!')
      );

      const mockRequest = {
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      };

      const loginResult = await app.commandBus.execute(
        new LoginUserCommand(
          'cqrs-logout-test@example.com',
          'SecurePass123!',
          mockRequest as Parameters<typeof LoginUserCommand.prototype.request>[0],
          false
        )
      );

      if ('sessionId' in loginResult) {
        // Execute logout
        await app.commandBus.execute(
          new LogoutUserCommand(loginResult.userId, loginResult.sessionId)
        );

        // Verify session was deleted
        const dbSession = await app.prisma.session.findUnique({
          where: { id: loginResult.sessionId },
        });
        expect(dbSession).toBeNull();
      }
    });

    it('should execute CreateApiKeyCommand through command bus', async () => {
      // Register a user
      const user = await app.commandBus.execute(
        new RegisterUserCommand('cqrs-apikey-test@example.com', 'SecurePass123!')
      );

      const result = await app.commandBus.execute(new CreateApiKeyCommand('Test API Key', user.id));

      expect(result.key).toMatch(/^lf_/);
      expect(result.apiKey.name).toBe('Test API Key');
      expect(result.apiKey.userId).toBe(user.id);

      // Verify API key was created in database
      const dbApiKey = await app.prisma.apiKey.findUnique({
        where: { id: result.apiKey.id },
      });
      expect(dbApiKey).not.toBeNull();
    });

    it('should execute RevokeApiKeyCommand through command bus', async () => {
      // Register a user and create API key
      const user = await app.commandBus.execute(
        new RegisterUserCommand('cqrs-revoke-test@example.com', 'SecurePass123!')
      );

      const apiKeyResult = await app.commandBus.execute(
        new CreateApiKeyCommand('Revoke Test Key', user.id)
      );

      // Revoke the API key
      await app.commandBus.execute(new RevokeApiKeyCommand(apiKeyResult.apiKey.id, user.id));

      // Verify API key was revoked
      const dbApiKey = await app.prisma.apiKey.findUnique({
        where: { id: apiKeyResult.apiKey.id },
      });
      expect(dbApiKey?.revokedAt).not.toBeNull();
    });
  });

  describe('Query Bus Flow', () => {
    it('should execute GetCurrentUserQuery through query bus', async () => {
      // Register a user
      const user = await app.commandBus.execute(
        new RegisterUserCommand('cqrs-getuser-test@example.com', 'SecurePass123!', 'Get User Test')
      );

      const result = await app.queryBus.execute(new GetCurrentUserQuery(user.id));

      expect(result).toMatchObject({
        id: user.id,
        email: 'cqrs-getuser-test@example.com',
        name: 'Get User Test',
      });
    });

    it('should execute ListApiKeysQuery through query bus', async () => {
      // Register a user and create API keys
      const user = await app.commandBus.execute(
        new RegisterUserCommand('cqrs-listkeys-test@example.com', 'SecurePass123!')
      );

      await app.commandBus.execute(new CreateApiKeyCommand('Key 1', user.id));
      await app.commandBus.execute(new CreateApiKeyCommand('Key 2', user.id));

      const result = await app.queryBus.execute(new ListApiKeysQuery(user.id));

      expect(result).toHaveLength(2);
      expect(result.map((k) => k.name)).toContain('Key 1');
      expect(result.map((k) => k.name)).toContain('Key 2');
    });
  });

  describe('Event Publishing', () => {
    it('should publish events when commands complete', async () => {
      const eventBus = container.resolve('eventBus');
      const publishSpy = vi.spyOn(eventBus, 'publish');

      // Execute a command that publishes an event
      await app.commandBus.execute(
        new RegisterUserCommand('cqrs-event-test@example.com', 'SecurePass123!')
      );

      // Verify event was published
      expect(publishSpy).toHaveBeenCalled();
      const publishedEvent = publishSpy.mock.calls[0][0];
      expect(publishedEvent.constructor.name).toBe('UserRegisteredEvent');

      publishSpy.mockRestore();
    });
  });
});
