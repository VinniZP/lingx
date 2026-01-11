import { beforeEach, describe, expect, it } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { VerifyEmailChangeCommand } from '../commands/verify-email-change.command.js';
import { VerifyEmailChangeHandler } from '../commands/verify-email-change.handler.js';
import { EmailVerifiedEvent } from '../events/email-verified.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import {
  createMockEventBus,
  createMockRepository,
  createMockUser,
  type MockEventBus,
  type MockRepository,
} from './test-utils.js';

describe('VerifyEmailChangeHandler', () => {
  let handler: VerifyEmailChangeHandler;
  let mockRepo: MockRepository;
  let mockEventBus: MockEventBus;

  const mockUser = createMockUser({ email: 'old@example.com' });

  const mockVerification = {
    id: 'verification-1',
    userId: 'user-1',
    newEmail: 'new@example.com',
    token: 'valid-token-123',
    expiresAt: new Date(Date.now() + 86400000), // Valid for 24 hours
    createdAt: new Date(),
    user: mockUser,
  };

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new VerifyEmailChangeHandler(
      mockRepo as unknown as ProfileRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should verify email change and return updated profile', async () => {
      // Arrange
      const command = new VerifyEmailChangeCommand('valid-token-123');
      mockRepo.findEmailVerificationByToken.mockResolvedValue(mockVerification);
      mockRepo.findByEmail.mockResolvedValue(null); // New email not taken
      mockRepo.completeEmailChange.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.email).toBe('new@example.com');
      expect(mockRepo.findEmailVerificationByToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockRepo.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockRepo.completeEmailChange).toHaveBeenCalledWith(
        'user-1',
        'new@example.com',
        'verification-1'
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('Error Cases', () => {
    it('should throw ValidationError when token is invalid', async () => {
      // Arrange
      const command = new VerifyEmailChangeCommand('invalid-token');
      mockRepo.findEmailVerificationByToken.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid or expired verification token'
      );
      expect(mockRepo.completeEmailChange).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when token is expired', async () => {
      // Arrange
      const expiredVerification = {
        ...mockVerification,
        expiresAt: new Date(Date.now() - 86400000), // Expired 24 hours ago
      };
      const command = new VerifyEmailChangeCommand('expired-token');
      mockRepo.findEmailVerificationByToken.mockResolvedValue(expiredVerification);
      mockRepo.deleteEmailVerification.mockResolvedValue(undefined);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Verification token has expired');
      expect(mockRepo.deleteEmailVerification).toHaveBeenCalledWith('verification-1');
      expect(mockRepo.completeEmailChange).not.toHaveBeenCalled();
    });

    it('should throw FieldValidationError when new email is now in use', async () => {
      // Arrange
      const command = new VerifyEmailChangeCommand('valid-token-123');
      mockRepo.findEmailVerificationByToken.mockResolvedValue(mockVerification);
      mockRepo.findByEmail.mockResolvedValue({ id: 'other-user' }); // Email now taken

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Email no longer available');
      expect(mockRepo.completeEmailChange).not.toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit EmailVerifiedEvent with correct data', async () => {
      // Arrange
      const command = new VerifyEmailChangeCommand('valid-token-123');
      mockRepo.findEmailVerificationByToken.mockResolvedValue(mockVerification);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.completeEmailChange.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(EmailVerifiedEvent);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.previousEmail).toBe('old@example.com');
      expect(publishedEvent.newEmail).toBe('new@example.com');
    });
  });
});
