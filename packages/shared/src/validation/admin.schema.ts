import { z } from 'zod';

// ============================================
// Admin User Role (Global)
// ============================================

/**
 * Global user roles (not project roles).
 * - ADMIN: Full system access, can manage all users
 * - MANAGER: Standard user with elevated permissions
 * - DEVELOPER: Standard user
 */
export const userRoleSchema = z.enum(['ADMIN', 'MANAGER', 'DEVELOPER']);
export type UserRole = z.infer<typeof userRoleSchema>;

// ============================================
// Admin Query Schemas
// ============================================

/**
 * User status filter for admin listing.
 */
export const userStatusSchema = z.enum(['active', 'disabled']);
export type UserStatus = z.infer<typeof userStatusSchema>;

/**
 * Query parameters for listing users in admin panel.
 * Supports filtering by role, status, and search term.
 */
export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// ============================================
// Admin Response Schemas
// ============================================

/**
 * User item in admin user list.
 * Includes basic info and project count for quick overview.
 */
export const adminUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
  isDisabled: z.boolean(),
  disabledAt: z.string().nullable(),
  createdAt: z.string(),
  projectCount: z.number(),
});

export type AdminUserResponse = z.infer<typeof adminUserResponseSchema>;

/**
 * Paginated user list response for admin panel.
 */
export const adminUserListResponseSchema = z.object({
  users: z.array(adminUserResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;

/**
 * User's project membership for admin details view.
 */
export const adminUserProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: z.enum(['OWNER', 'MANAGER', 'DEVELOPER']),
});

export type AdminUserProject = z.infer<typeof adminUserProjectSchema>;

/**
 * Admin who disabled a user (for audit display).
 */
export const disabledByUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

export type DisabledByUser = z.infer<typeof disabledByUserSchema>;

/**
 * User statistics for admin details view.
 */
export const adminUserStatsSchema = z.object({
  projectCount: z.number(),
  lastActiveAt: z.string().nullable(),
});

export type AdminUserStats = z.infer<typeof adminUserStatsSchema>;

/**
 * Detailed user view for admin panel.
 * Includes projects, stats, and who disabled the user (if applicable).
 */
export const adminUserDetailsResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
  isDisabled: z.boolean(),
  disabledAt: z.string().nullable(),
  disabledBy: disabledByUserSchema.nullable(),
  createdAt: z.string(),
  projects: z.array(adminUserProjectSchema),
  stats: adminUserStatsSchema,
});

export type AdminUserDetailsResponse = z.infer<typeof adminUserDetailsResponseSchema>;

/**
 * Impersonation token response.
 * Token allows admin to act as another user for 1 hour.
 */
export const impersonationTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});

export type ImpersonationTokenResponse = z.infer<typeof impersonationTokenResponseSchema>;
