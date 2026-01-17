import { z } from 'zod';

// ============================================
// Audit Log Action Types
// ============================================

/**
 * Supported audit log actions for admin operations.
 */
export const auditLogActionSchema = z.enum(['USER_DISABLED', 'USER_ENABLED', 'USER_IMPERSONATED']);

export type AuditLogAction = z.infer<typeof auditLogActionSchema>;

// ============================================
// Audit Log Query Schemas
// ============================================

/**
 * Query parameters for listing audit logs.
 * Supports filtering by admin, action, target, and date range.
 */
export const auditLogQuerySchema = z.object({
  adminId: z.string().optional(),
  action: auditLogActionSchema.optional(),
  targetId: z.string().optional(),
  targetType: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

// ============================================
// Audit Log Response Schemas
// ============================================

/**
 * Admin user info included in audit log entries.
 */
export const auditLogAdminSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
});

export type AuditLogAdmin = z.infer<typeof auditLogAdminSchema>;

/**
 * Single audit log entry response.
 * Includes all captured data: before/after state, metadata, and request context.
 */
export const auditLogResponseSchema = z.object({
  id: z.string(),
  adminId: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  beforeState: z.unknown().nullable(),
  afterState: z.unknown().nullable(),
  metadata: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  admin: auditLogAdminSchema,
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

/**
 * Paginated audit log list response.
 */
export const auditLogListResponseSchema = z.object({
  auditLogs: z.array(auditLogResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;
