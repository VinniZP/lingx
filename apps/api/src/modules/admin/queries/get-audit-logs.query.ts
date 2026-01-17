import type { IQuery } from '../../../shared/cqrs/index.js';
import type { PaginatedAuditLogs } from '../repositories/audit-log.repository.js';

/** Filters for audit log queries */
export interface AuditLogQueryFilters {
  adminId?: string;
  action?: 'USER_DISABLED' | 'USER_ENABLED' | 'USER_IMPERSONATED';
  targetId?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
}

/** Pagination for audit log queries */
export interface AuditLogQueryPagination {
  page: number;
  limit: number;
}

/**
 * Query to get paginated audit logs with optional filters.
 *
 * Permission rules:
 * - Only ADMIN can view audit logs
 */
export class GetAuditLogsQuery implements IQuery<PaginatedAuditLogs> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: PaginatedAuditLogs;

  constructor(
    /** Filters for the query */
    public readonly filters: AuditLogQueryFilters,
    /** Pagination options */
    public readonly pagination: AuditLogQueryPagination,
    /** ID of the user making the request (for authorization) */
    public readonly actorId: string
  ) {}
}
