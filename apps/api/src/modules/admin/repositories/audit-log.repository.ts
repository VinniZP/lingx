/**
 * Audit Log Repository
 *
 * Data access layer for audit log operations.
 * Encapsulates all Prisma queries for audit logging.
 */

import { Prisma, type PrismaClient } from '@prisma/client';

// ============================================
// Types
// ============================================

export type AuditLogAction = 'USER_DISABLED' | 'USER_ENABLED' | 'USER_IMPERSONATED';

export interface CreateAuditLogInput {
  adminId: string;
  action: AuditLogAction;
  targetType: string;
  targetId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogFilters {
  adminId?: string;
  action?: AuditLogAction;
  targetId?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeState: unknown;
  afterState: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  admin: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface PaginatedAuditLogs {
  auditLogs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// Repository
// ============================================

export class AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new audit log entry.
   */
  async create(input: CreateAuditLogInput): Promise<AuditLogEntry> {
    return this.prisma.auditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        beforeState: (input.beforeState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        afterState: (input.afterState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      select: {
        id: true,
        adminId: true,
        action: true,
        targetType: true,
        targetId: true,
        beforeState: true,
        afterState: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Find all audit logs with filters and pagination.
   */
  async findAll(
    filters: AuditLogFilters,
    pagination: AuditLogPagination
  ): Promise<PaginatedAuditLogs> {
    const where = this.buildWhereClause(filters);

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          adminId: true,
          action: true,
          targetType: true,
          targetId: true,
          beforeState: true,
          afterState: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      auditLogs,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  /**
   * Find a single audit log entry by ID.
   */
  async findById(id: string): Promise<AuditLogEntry | null> {
    return this.prisma.auditLog.findUnique({
      where: { id },
      select: {
        id: true,
        adminId: true,
        action: true,
        targetType: true,
        targetId: true,
        beforeState: true,
        afterState: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Build Prisma where clause from filters.
   */
  private buildWhereClause(filters: AuditLogFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filters.adminId) {
      where.adminId = filters.adminId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.targetId) {
      where.targetId = filters.targetId;
    }

    if (filters.targetType) {
      where.targetType = filters.targetType;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, Date>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, Date>).lte = filters.endDate;
      }
    }

    return where;
  }
}
