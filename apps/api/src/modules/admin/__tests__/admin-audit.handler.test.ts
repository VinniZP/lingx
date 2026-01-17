/**
 * AdminAuditHandler Unit Tests
 *
 * Tests for audit log event handler.
 */

import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { UserDisabledEvent } from '../events/user-disabled.event.js';
import { UserEnabledEvent } from '../events/user-enabled.event.js';
import { UserImpersonatedEvent } from '../events/user-impersonated.event.js';
import { AdminAuditHandler } from '../handlers/admin-audit.handler.js';
import type { AuditLogRepository } from '../repositories/audit-log.repository.js';

interface MockAuditLogRepository {
  create: Mock;
  findAll: Mock;
  findById: Mock;
}

interface MockLogger {
  info: Mock;
  error: Mock;
}

function createMockRepository(): MockAuditLogRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
  };
}

function createMockLogger(): MockLogger {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

describe('AdminAuditHandler', () => {
  let handler: AdminAuditHandler;
  let mockRepository: MockAuditLogRepository;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockLogger = createMockLogger();
    handler = new AdminAuditHandler(
      mockRepository as unknown as AuditLogRepository,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  describe('handle UserDisabledEvent', () => {
    it('should create audit log entry for user disabled event', async () => {
      // Arrange
      const event = new UserDisabledEvent(
        'user-1',
        'admin-1',
        true,
        { ipAddress: '192.168.1.1', userAgent: 'TestBrowser/1.0' },
        { isDisabled: false, disabledAt: null },
        { isDisabled: true, disabledAt: '2024-01-01T00:00:00Z' }
      );
      mockRepository.create.mockResolvedValue({ id: 'audit-1' });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'USER_DISABLED',
        targetType: 'USER',
        targetId: 'user-1',
        beforeState: { isDisabled: false, disabledAt: null },
        afterState: { isDisabled: true, disabledAt: '2024-01-01T00:00:00Z' },
        metadata: { anonymized: true },
        ipAddress: '192.168.1.1',
        userAgent: 'TestBrowser/1.0',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_DISABLED', adminId: 'admin-1' }),
        'Admin audit: User disabled'
      );
    });

    it('should log error if audit log creation fails', async () => {
      // Arrange
      const event = new UserDisabledEvent('user-1', 'admin-1', true);
      mockRepository.create.mockRejectedValue(new Error('Database error'));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to create audit log entry'
      );
    });
  });

  describe('handle UserEnabledEvent', () => {
    it('should create audit log entry for user enabled event', async () => {
      // Arrange
      const event = new UserEnabledEvent(
        'user-1',
        'admin-1',
        { ipAddress: '10.0.0.1', userAgent: 'Mozilla/5.0' },
        { isDisabled: true, disabledAt: '2024-01-01T00:00:00Z' },
        { isDisabled: false, disabledAt: null }
      );
      mockRepository.create.mockResolvedValue({ id: 'audit-2' });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'USER_ENABLED',
        targetType: 'USER',
        targetId: 'user-1',
        beforeState: { isDisabled: true, disabledAt: '2024-01-01T00:00:00Z' },
        afterState: { isDisabled: false, disabledAt: null },
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_ENABLED', adminId: 'admin-1' }),
        'Admin audit: User enabled'
      );
    });
  });

  describe('handle UserImpersonatedEvent', () => {
    it('should create audit log entry for user impersonated event', async () => {
      // Arrange
      const tokenExpiry = new Date('2024-01-01T01:00:00Z');
      const event = new UserImpersonatedEvent(
        'user-1',
        'admin-1',
        tokenExpiry,
        { ipAddress: '172.16.0.1', userAgent: 'Chrome/100' },
        { id: 'user-1', email: 'user@example.com', name: 'Test User', role: 'DEVELOPER' }
      );
      mockRepository.create.mockResolvedValue({ id: 'audit-3' });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'USER_IMPERSONATED',
        targetType: 'USER',
        targetId: 'user-1',
        beforeState: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'DEVELOPER',
        },
        metadata: { tokenExpiry: tokenExpiry.toISOString() },
        ipAddress: '172.16.0.1',
        userAgent: 'Chrome/100',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_IMPERSONATED', adminId: 'admin-1' }),
        'Admin audit: User impersonated'
      );
    });
  });

  describe('error handling', () => {
    it('should not propagate errors from audit log creation', async () => {
      // Arrange
      const event = new UserDisabledEvent('user-1', 'admin-1', false);
      mockRepository.create.mockRejectedValue(new Error('Connection failed'));

      // Act & Assert - should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
