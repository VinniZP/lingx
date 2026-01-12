import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { EmailService } from '../../../shared/infrastructure/email.service.js';
import { InitiateEmailChangeCommand } from '../commands/initiate-email-change.command.js';
import { InitiateEmailChangeHandler } from '../commands/initiate-email-change.handler.js';
import { EmailChangeInitiatedEvent } from '../events/email-change-initiated.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import {
  createMockEmailService,
  createMockEventBus,
  createMockRepository,
  createMockUser,
  type MockEmailService,
  type MockEventBus,
  type MockRepository,
} from './test-utils.js';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('InitiateEmailChangeHandler', () => {
  let handler: InitiateEmailChangeHandler;
  let mockRepo: MockRepository;
  let mockEmailService: MockEmailService;
  let mockEventBus: MockEventBus;

  const mockUser = createMockUser({
    email: 'old@example.com',
    preferences: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    mockEmailService = createMockEmailService();
    mockEventBus = createMockEventBus();
    handler = new InitiateEmailChangeHandler(
      mockRepo as unknown as ProfileRepository,
      mockEmailService as unknown as EmailService,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should initiate email change and send verification emails', async () => {
      // Arrange
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'new@example.com',
        password: 'correct-password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockRepo.findByEmail.mockResolvedValue(null); // New email not in use
      mockRepo.deleteUserEmailVerifications.mockResolvedValue(undefined);
      mockRepo.createEmailVerification.mockResolvedValue({
        id: 'verification-1',
        userId: 'user-1',
        newEmail: 'new@example.com',
        token: 'token-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);
      mockEmailService.sendEmailChangeNotification.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepo.findByIdSimple).toHaveBeenCalledWith('user-1');
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
      expect(mockRepo.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockRepo.deleteUserEmailVerifications).toHaveBeenCalledWith('user-1');
      expect(mockRepo.createEmailVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          newEmail: 'new@example.com',
        })
      );
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith(
        'new@example.com',
        expect.any(String),
        'Test User'
      );
      expect(mockEmailService.sendEmailChangeNotification).toHaveBeenCalledWith(
        'old@example.com',
        'new@example.com',
        'Test User'
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const command = new InitiateEmailChangeCommand('nonexistent-user', {
        newEmail: 'new@example.com',
        password: 'password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('User not found');
      expect(mockEmailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when user has no password (passwordless)', async () => {
      // Arrange
      const passwordlessUser = { ...mockUser, password: null };
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'new@example.com',
        password: 'password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(passwordlessUser);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Passwordless users cannot change email with password verification'
      );
    });

    it('should throw UnauthorizedError when password is incorrect', async () => {
      // Arrange
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'new@example.com',
        password: 'wrong-password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Invalid password');
    });

    it('should throw ValidationError when new email is same as current', async () => {
      // Arrange
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'old@example.com',
        password: 'correct-password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'New email must be different from current email'
      );
    });

    it('should throw FieldValidationError when new email is already in use', async () => {
      // Arrange
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'existing@example.com',
        password: 'correct-password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockRepo.findByEmail.mockResolvedValue({ id: 'other-user' }); // Email in use

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Email already in use');
    });

    it('should reject when new email differs only in case', async () => {
      // Arrange - user email is 'old@example.com', try to change to 'OLD@EXAMPLE.COM'
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'OLD@EXAMPLE.COM',
        password: 'correct-password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'New email must be different from current email'
      );
    });

    it('should rollback verification record and throw when verification email fails', async () => {
      // Arrange
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'new@example.com',
        password: 'correct-password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.deleteUserEmailVerifications.mockResolvedValue(undefined);
      mockRepo.createEmailVerification.mockResolvedValue({
        id: 'verification-1',
        userId: 'user-1',
        newEmail: 'new@example.com',
        token: 'token-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      mockEmailService.sendEmailVerification.mockRejectedValue(new Error('SMTP down'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Failed to send verification email. Please try again.'
      );
      // Should rollback the verification record
      expect(mockRepo.deleteUserEmailVerifications).toHaveBeenCalledTimes(2); // Once at start, once for rollback
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should succeed even when notification email fails', async () => {
      // Arrange
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'new@example.com',
        password: 'correct-password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.deleteUserEmailVerifications.mockResolvedValue(undefined);
      mockRepo.createEmailVerification.mockResolvedValue({
        id: 'verification-1',
        userId: 'user-1',
        newEmail: 'new@example.com',
        token: 'token-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);
      mockEmailService.sendEmailChangeNotification.mockRejectedValue(new Error('SMTP down'));
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act - should not throw
      await handler.execute(command);

      // Assert - notification failure doesn't block the operation
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit EmailChangeInitiatedEvent with correct data', async () => {
      // Arrange
      const command = new InitiateEmailChangeCommand('user-1', {
        newEmail: 'new@example.com',
        password: 'correct-password',
      });
      mockRepo.findByIdSimple.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.deleteUserEmailVerifications.mockResolvedValue(undefined);
      mockRepo.createEmailVerification.mockResolvedValue({
        id: 'verification-1',
        userId: 'user-1',
        newEmail: 'new@example.com',
        token: 'token-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);
      mockEmailService.sendEmailChangeNotification.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(EmailChangeInitiatedEvent);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.currentEmail).toBe('old@example.com');
      expect(publishedEvent.newEmail).toBe('new@example.com');
    });
  });
});
