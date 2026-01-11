import { beforeEach, describe, expect, it } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { CancelEmailChangeCommand } from '../commands/cancel-email-change.command.js';
import { CancelEmailChangeHandler } from '../commands/cancel-email-change.handler.js';
import { EmailChangeCancelledEvent } from '../events/email-change-cancelled.event.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import {
  createMockEventBus,
  createMockRepository,
  type MockEventBus,
  type MockRepository,
} from './test-utils.js';

describe('CancelEmailChangeHandler', () => {
  let handler: CancelEmailChangeHandler;
  let mockRepo: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new CancelEmailChangeHandler(
      mockRepo as unknown as ProfileRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should cancel pending email change and emit EmailChangeCancelledEvent', async () => {
      // Arrange
      const command = new CancelEmailChangeCommand('user-1');
      mockRepo.deleteUserEmailVerifications.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepo.deleteUserEmailVerifications).toHaveBeenCalledWith('user-1');
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit EmailChangeCancelledEvent with correct data', async () => {
      // Arrange
      const command = new CancelEmailChangeCommand('user-1');
      mockRepo.deleteUserEmailVerifications.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(EmailChangeCancelledEvent);
      expect(publishedEvent.userId).toBe('user-1');
    });
  });
});
