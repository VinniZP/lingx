/**
 * GetAuditLogsHandler Unit Tests
 *
 * Tests for audit log query handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { GetAuditLogsHandler } from '../queries/get-audit-logs.handler.js';
import { GetAuditLogsQuery } from '../queries/get-audit-logs.query.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type {
  AuditLogRepository,
  PaginatedAuditLogs,
} from '../repositories/audit-log.repository.js';

interface MockAdminRepository {
  findUserRoleById: Mock;
}

interface MockAuditLogRepository {
  create: Mock;
  findAll: Mock;
  findById: Mock;
}

function createMockAdminRepository(): MockAdminRepository {
  return {
    findUserRoleById: vi.fn(),
  };
}

function createMockAuditLogRepository(): MockAuditLogRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
  };
}

describe('GetAuditLogsHandler', () => {
  let handler: GetAuditLogsHandler;
  let mockAdminRepository: MockAdminRepository;
  let mockAuditLogRepository: MockAuditLogRepository;

  beforeEach(() => {
    mockAdminRepository = createMockAdminRepository();
    mockAuditLogRepository = createMockAuditLogRepository();
    handler = new GetAuditLogsHandler(
      mockAdminRepository as unknown as AdminRepository,
      mockAuditLogRepository as unknown as AuditLogRepository
    );
  });

  describe('execute', () => {
    const mockAuditLogs: PaginatedAuditLogs = {
      auditLogs: [
        {
          id: 'audit-1',
          adminId: 'admin-1',
          action: 'USER_DISABLED',
          targetType: 'USER',
          targetId: 'user-1',
          beforeState: { isDisabled: false },
          afterState: { isDisabled: true },
          metadata: null,
          ipAddress: '192.168.1.1',
          userAgent: 'TestBrowser/1.0',
          createdAt: new Date('2024-01-01'),
          admin: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User' },
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    };

    it('should return audit logs when actor is ADMIN', async () => {
      // Arrange
      mockAdminRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');
      mockAuditLogRepository.findAll.mockResolvedValueOnce(mockAuditLogs);

      const query = new GetAuditLogsQuery({}, { page: 1, limit: 50 }, 'admin-user');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockAuditLogs);
      expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith({}, { page: 1, limit: 50 });
    });

    it('should apply filters to query', async () => {
      // Arrange
      mockAdminRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');
      mockAuditLogRepository.findAll.mockResolvedValueOnce(mockAuditLogs);

      const query = new GetAuditLogsQuery(
        { action: 'USER_DISABLED', adminId: 'admin-1' },
        { page: 2, limit: 10 },
        'admin-user'
      );

      // Act
      await handler.execute(query);

      // Assert
      expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith(
        { action: 'USER_DISABLED', adminId: 'admin-1' },
        { page: 2, limit: 10 }
      );
    });

    it('should apply date filters to query', async () => {
      // Arrange
      mockAdminRepository.findUserRoleById.mockResolvedValueOnce('ADMIN');
      mockAuditLogRepository.findAll.mockResolvedValueOnce(mockAuditLogs);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const query = new GetAuditLogsQuery(
        { startDate, endDate },
        { page: 1, limit: 50 },
        'admin-user'
      );

      // Act
      await handler.execute(query);

      // Assert
      expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith(
        { startDate, endDate },
        { page: 1, limit: 50 }
      );
    });

    it('should throw ForbiddenError when actor is not ADMIN', async () => {
      // Arrange
      mockAdminRepository.findUserRoleById.mockResolvedValueOnce('DEVELOPER');

      const query = new GetAuditLogsQuery({}, { page: 1, limit: 50 }, 'regular-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Admin access required');
      expect(mockAuditLogRepository.findAll).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when actor not found', async () => {
      // Arrange
      mockAdminRepository.findUserRoleById.mockResolvedValueOnce(null);

      const query = new GetAuditLogsQuery({}, { page: 1, limit: 50 }, 'nonexistent');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('User not found');
      expect(mockAuditLogRepository.findAll).not.toHaveBeenCalled();
    });
  });
});
