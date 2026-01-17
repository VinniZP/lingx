import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { AuditLogRepository } from '../repositories/audit-log.repository.js';
import type { GetAuditLogsQuery } from './get-audit-logs.query.js';

/**
 * Handler for GetAuditLogsQuery.
 * Returns paginated audit logs with optional filters.
 */
export class GetAuditLogsHandler implements IQueryHandler<GetAuditLogsQuery> {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  async execute(query: GetAuditLogsQuery): Promise<InferQueryResult<GetAuditLogsQuery>> {
    const { filters, pagination, actorId } = query;

    // 1. Verify actor is an admin
    const actorRole = await this.adminRepository.findUserRoleById(actorId);
    if (!actorRole) {
      throw new NotFoundError('User not found');
    }
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // 2. Fetch audit logs with filters
    return this.auditLogRepository.findAll(
      {
        adminId: filters.adminId,
        action: filters.action,
        targetId: filters.targetId,
        targetType: filters.targetType,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      {
        page: pagination.page,
        limit: pagination.limit,
      }
    );
  }
}
