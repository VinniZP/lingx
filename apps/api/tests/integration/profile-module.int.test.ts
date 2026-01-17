/**
 * Profile Module Integration Tests
 *
 * Tests the CQRS flow from command/query bus through handlers.
 * Verifies module registration and event publishing.
 */
import type { AwilixContainer } from 'awilix';
import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { RegisterUserCommand } from '../../src/modules/auth/commands/register-user.command.js';
import { CancelEmailChangeHandler } from '../../src/modules/profile/commands/cancel-email-change.handler.js';
import { DeleteAvatarHandler } from '../../src/modules/profile/commands/delete-avatar.handler.js';
import { InitiateEmailChangeHandler } from '../../src/modules/profile/commands/initiate-email-change.handler.js';
import { UpdateAvatarHandler } from '../../src/modules/profile/commands/update-avatar.handler.js';
import { UpdatePreferencesHandler } from '../../src/modules/profile/commands/update-preferences.handler.js';
import { UpdateProfileHandler } from '../../src/modules/profile/commands/update-profile.handler.js';
import { VerifyEmailChangeHandler } from '../../src/modules/profile/commands/verify-email-change.handler.js';
import { ProfileActivityHandler } from '../../src/modules/profile/handlers/profile-activity.handler.js';
import {
  CancelEmailChangeCommand,
  DeleteAvatarCommand,
  GetProfileQuery,
  InitiateEmailChangeCommand,
  UpdatePreferencesCommand,
  UpdateProfileCommand,
  VerifyEmailChangeCommand,
} from '../../src/modules/profile/index.js';
import { GetProfileHandler } from '../../src/modules/profile/queries/get-profile.handler.js';
import type { Cradle } from '../../src/shared/container/index.js';

describe('Profile Module Integration', () => {
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
    // Mock email service to avoid SMTP connection errors in tests
    const emailService = container.resolve('emailService');
    vi.spyOn(emailService, 'send').mockResolvedValue(undefined);
    vi.spyOn(emailService, 'sendEmailVerification').mockResolvedValue(undefined);
    vi.spyOn(emailService, 'sendEmailChangeNotification').mockResolvedValue(undefined);

    // Clean up test data
    await app.prisma.auditLog.deleteMany({});
    await app.prisma.emailVerification.deleteMany({});
    await app.prisma.session.deleteMany({});
    await app.prisma.projectMember.deleteMany({});
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'profile-test' } },
    });
  });

  describe('Handler Registration', () => {
    it('should register all command handlers in container', () => {
      const updateProfileHandler = container.resolve('updateProfileHandler');
      const updatePreferencesHandler = container.resolve('updatePreferencesHandler');
      const updateAvatarHandler = container.resolve('updateAvatarHandler');
      const deleteAvatarHandler = container.resolve('deleteAvatarHandler');
      const initiateEmailChangeHandler = container.resolve('initiateEmailChangeHandler');
      const verifyEmailChangeHandler = container.resolve('verifyEmailChangeHandler');
      const cancelEmailChangeHandler = container.resolve('cancelEmailChangeHandler');

      expect(updateProfileHandler).toBeInstanceOf(UpdateProfileHandler);
      expect(updatePreferencesHandler).toBeInstanceOf(UpdatePreferencesHandler);
      expect(updateAvatarHandler).toBeInstanceOf(UpdateAvatarHandler);
      expect(deleteAvatarHandler).toBeInstanceOf(DeleteAvatarHandler);
      expect(initiateEmailChangeHandler).toBeInstanceOf(InitiateEmailChangeHandler);
      expect(verifyEmailChangeHandler).toBeInstanceOf(VerifyEmailChangeHandler);
      expect(cancelEmailChangeHandler).toBeInstanceOf(CancelEmailChangeHandler);
    });

    it('should register query handler in container', () => {
      const getProfileHandler = container.resolve('getProfileHandler');
      expect(getProfileHandler).toBeInstanceOf(GetProfileHandler);
    });

    it('should register event handler in container', () => {
      const profileActivityHandler = container.resolve('profileActivityHandler');
      expect(profileActivityHandler).toBeInstanceOf(ProfileActivityHandler);
    });
  });

  describe('GetProfileQuery', () => {
    it('should return user profile with preferences', async () => {
      // Create a user
      const user = await app.commandBus.execute(
        new RegisterUserCommand(
          'profile-test-get@example.com',
          'SecurePass123!',
          'Profile Test User'
        )
      );

      const profile = await app.queryBus.execute(new GetProfileQuery(user.id));

      expect(profile).toMatchObject({
        id: user.id,
        email: 'profile-test-get@example.com',
        name: 'Profile Test User',
      });
      expect(profile.preferences).toBeDefined();
      expect(profile.preferences.theme).toBeDefined();
      expect(profile.preferences.language).toBeDefined();
    });

    it('should return default preferences for new user', async () => {
      const user = await app.commandBus.execute(
        new RegisterUserCommand('profile-test-defaults@example.com', 'SecurePass123!')
      );

      const profile = await app.queryBus.execute(new GetProfileQuery(user.id));

      expect(profile.preferences).toMatchObject({
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          inApp: true,
          digestFrequency: 'weekly',
        },
        defaultProjectId: null,
      });
    });

    it('should include pending email change if exists', async () => {
      // Create a user with hashed password for password verification
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-pending@example.com',
          password: hashedPassword,
          name: 'Pending Email Test',
        },
      });

      // Create pending email verification
      await app.prisma.emailVerification.create({
        data: {
          userId: user.id,
          newEmail: 'newemail@example.com',
          token: 'test-token-123',
          expiresAt: new Date(Date.now() + 86400000), // 24 hours
        },
      });

      const profile = await app.queryBus.execute(new GetProfileQuery(user.id));

      expect(profile.pendingEmailChange).toBe('newemail@example.com');
    });
  });

  describe('UpdateProfileCommand', () => {
    it('should update user name', async () => {
      const user = await app.commandBus.execute(
        new RegisterUserCommand(
          'profile-test-update@example.com',
          'SecurePass123!',
          'Original Name'
        )
      );

      const result = await app.commandBus.execute(
        new UpdateProfileCommand(user.id, { name: 'Updated Name' })
      );

      expect(result.name).toBe('Updated Name');

      // Verify in database
      const dbUser = await app.prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.name).toBe('Updated Name');
    });

    it('should publish ProfileUpdatedEvent', async () => {
      const eventBus = container.resolve('eventBus');
      const publishSpy = vi.spyOn(eventBus, 'publish');

      const user = await app.commandBus.execute(
        new RegisterUserCommand('profile-test-event@example.com', 'SecurePass123!')
      );

      await app.commandBus.execute(new UpdateProfileCommand(user.id, { name: 'Event Test' }));

      expect(publishSpy).toHaveBeenCalled();
      const publishedEvent = publishSpy.mock.calls.find(
        (call) => call[0].constructor.name === 'ProfileUpdatedEvent'
      );
      expect(publishedEvent).toBeDefined();

      publishSpy.mockRestore();
    });
  });

  describe('UpdatePreferencesCommand', () => {
    it('should update user preferences', async () => {
      const user = await app.commandBus.execute(
        new RegisterUserCommand('profile-test-prefs@example.com', 'SecurePass123!')
      );

      const result = await app.commandBus.execute(
        new UpdatePreferencesCommand(user.id, {
          theme: 'dark',
          language: 'es',
          notifications: {
            email: false,
            inApp: true,
            digestFrequency: 'weekly',
          },
        })
      );

      expect(result.theme).toBe('dark');
      expect(result.language).toBe('es');
      expect(result.notifications.email).toBe(false);
      expect(result.notifications.digestFrequency).toBe('weekly');

      // Verify in database
      const dbUser = await app.prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.preferences).toMatchObject({
        theme: 'dark',
        language: 'es',
      });
    });

    it('should publish PreferencesUpdatedEvent', async () => {
      const eventBus = container.resolve('eventBus');
      const publishSpy = vi.spyOn(eventBus, 'publish');

      const user = await app.commandBus.execute(
        new RegisterUserCommand('profile-test-prefs-event@example.com', 'SecurePass123!')
      );

      await app.commandBus.execute(new UpdatePreferencesCommand(user.id, { theme: 'light' }));

      expect(publishSpy).toHaveBeenCalled();
      const publishedEvent = publishSpy.mock.calls.find(
        (call) => call[0].constructor.name === 'PreferencesUpdatedEvent'
      );
      expect(publishedEvent).toBeDefined();

      publishSpy.mockRestore();
    });
  });

  describe('DeleteAvatarCommand', () => {
    it('should remove avatar URL', async () => {
      // Create user with avatar URL directly
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-avatar@example.com',
          password: hashedPassword,
          name: 'Avatar Test',
          avatarUrl: 'http://localhost:3001/uploads/avatars/old-avatar.jpg',
        },
      });

      await app.commandBus.execute(new DeleteAvatarCommand(user.id));

      // Verify in database
      const dbUser = await app.prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.avatarUrl).toBeNull();
    });

    it('should publish AvatarDeletedEvent', async () => {
      const eventBus = container.resolve('eventBus');
      const publishSpy = vi.spyOn(eventBus, 'publish');

      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-avatar-event@example.com',
          password: hashedPassword,
          name: 'Avatar Event Test',
          avatarUrl: 'http://localhost:3001/uploads/avatars/test.jpg',
        },
      });

      await app.commandBus.execute(new DeleteAvatarCommand(user.id));

      expect(publishSpy).toHaveBeenCalled();
      const publishedEvent = publishSpy.mock.calls.find(
        (call) => call[0].constructor.name === 'AvatarDeletedEvent'
      );
      expect(publishedEvent).toBeDefined();

      publishSpy.mockRestore();
    });
  });

  describe('InitiateEmailChangeCommand', () => {
    it('should create email verification record', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-initiate@example.com',
          password: hashedPassword,
          name: 'Initiate Email Test',
        },
      });

      await app.commandBus.execute(
        new InitiateEmailChangeCommand(user.id, {
          newEmail: 'new-email@example.com',
          password: 'SecurePass123!',
        })
      );

      // Verify verification record was created
      const verification = await app.prisma.emailVerification.findFirst({
        where: { userId: user.id },
      });
      expect(verification).not.toBeNull();
      expect(verification?.newEmail).toBe('new-email@example.com');
    });

    it('should reject if new email already exists', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

      // Create existing user
      await app.prisma.user.create({
        data: {
          email: 'profile-test-existing@example.com',
          password: hashedPassword,
        },
      });

      // Create user trying to change email
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-change@example.com',
          password: hashedPassword,
        },
      });

      await expect(
        app.commandBus.execute(
          new InitiateEmailChangeCommand(user.id, {
            newEmail: 'profile-test-existing@example.com',
            password: 'SecurePass123!',
          })
        )
      ).rejects.toThrow('Email already in use');
    });

    it('should require password verification', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-password@example.com',
          password: hashedPassword,
        },
      });

      await expect(
        app.commandBus.execute(
          new InitiateEmailChangeCommand(user.id, {
            newEmail: 'new@example.com',
            password: 'WrongPassword123!',
          })
        )
      ).rejects.toThrow('Invalid password');
    });

    it('should publish EmailChangeInitiatedEvent', async () => {
      const eventBus = container.resolve('eventBus');
      const publishSpy = vi.spyOn(eventBus, 'publish');

      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-initiate-event@example.com',
          password: hashedPassword,
        },
      });

      await app.commandBus.execute(
        new InitiateEmailChangeCommand(user.id, {
          newEmail: 'new-email-event@example.com',
          password: 'SecurePass123!',
        })
      );

      expect(publishSpy).toHaveBeenCalled();
      const publishedEvent = publishSpy.mock.calls.find(
        (call) => call[0].constructor.name === 'EmailChangeInitiatedEvent'
      );
      expect(publishedEvent).toBeDefined();

      publishSpy.mockRestore();
    });
  });

  describe('VerifyEmailChangeCommand', () => {
    it('should update user email on valid token', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-verify@example.com',
          password: hashedPassword,
        },
      });

      // Create verification record
      await app.prisma.emailVerification.create({
        data: {
          userId: user.id,
          newEmail: 'verified@example.com',
          token: 'valid-token-123',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const result = await app.commandBus.execute(new VerifyEmailChangeCommand('valid-token-123'));

      expect(result.email).toBe('verified@example.com');

      // Verify in database
      const dbUser = await app.prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.email).toBe('verified@example.com');
    });

    it('should reject expired token', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-expired@example.com',
          password: hashedPassword,
        },
      });

      // Create expired verification record
      await app.prisma.emailVerification.create({
        data: {
          userId: user.id,
          newEmail: 'expired@example.com',
          token: 'expired-token-123',
          expiresAt: new Date(Date.now() - 86400000), // 24 hours ago
        },
      });

      await expect(
        app.commandBus.execute(new VerifyEmailChangeCommand('expired-token-123'))
      ).rejects.toThrow('Verification token has expired');
    });

    it('should reject invalid token', async () => {
      await expect(
        app.commandBus.execute(new VerifyEmailChangeCommand('invalid-token-xyz'))
      ).rejects.toThrow('Invalid or expired verification token');
    });

    it('should publish EmailVerifiedEvent', async () => {
      const eventBus = container.resolve('eventBus');
      const publishSpy = vi.spyOn(eventBus, 'publish');

      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-verify-event@example.com',
          password: hashedPassword,
        },
      });

      await app.prisma.emailVerification.create({
        data: {
          userId: user.id,
          newEmail: 'verified-event@example.com',
          token: 'verify-event-token',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      await app.commandBus.execute(new VerifyEmailChangeCommand('verify-event-token'));

      expect(publishSpy).toHaveBeenCalled();
      const publishedEvent = publishSpy.mock.calls.find(
        (call) => call[0].constructor.name === 'EmailVerifiedEvent'
      );
      expect(publishedEvent).toBeDefined();

      publishSpy.mockRestore();
    });
  });

  describe('CancelEmailChangeCommand', () => {
    it('should delete pending email verification', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-cancel@example.com',
          password: hashedPassword,
        },
      });

      // Create verification record
      await app.prisma.emailVerification.create({
        data: {
          userId: user.id,
          newEmail: 'cancelled@example.com',
          token: 'cancel-token-123',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      await app.commandBus.execute(new CancelEmailChangeCommand(user.id));

      // Verify verification was deleted
      const verification = await app.prisma.emailVerification.findFirst({
        where: { userId: user.id },
      });
      expect(verification).toBeNull();
    });

    it('should publish EmailChangeCancelledEvent', async () => {
      const eventBus = container.resolve('eventBus');
      const publishSpy = vi.spyOn(eventBus, 'publish');

      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const user = await app.prisma.user.create({
        data: {
          email: 'profile-test-cancel-event@example.com',
          password: hashedPassword,
        },
      });

      await app.prisma.emailVerification.create({
        data: {
          userId: user.id,
          newEmail: 'cancel-event@example.com',
          token: 'cancel-event-token',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      await app.commandBus.execute(new CancelEmailChangeCommand(user.id));

      expect(publishSpy).toHaveBeenCalled();
      const publishedEvent = publishSpy.mock.calls.find(
        (call) => call[0].constructor.name === 'EmailChangeCancelledEvent'
      );
      expect(publishedEvent).toBeDefined();

      publishSpy.mockRestore();
    });
  });

  describe('Event Publishing', () => {
    it('should publish events when commands complete', async () => {
      const eventBus = container.resolve('eventBus');
      const publishSpy = vi.spyOn(eventBus, 'publish');

      const user = await app.commandBus.execute(
        new RegisterUserCommand('profile-test-events@example.com', 'SecurePass123!')
      );

      // Execute a profile command
      await app.commandBus.execute(new UpdateProfileCommand(user.id, { name: 'Event Test User' }));

      // Verify event was published
      expect(publishSpy).toHaveBeenCalled();
      const profileEvent = publishSpy.mock.calls.find(
        (call) => call[0].constructor.name === 'ProfileUpdatedEvent'
      );
      expect(profileEvent).toBeDefined();

      publishSpy.mockRestore();
    });
  });
});
