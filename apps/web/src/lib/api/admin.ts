/**
 * Admin API Client
 *
 * Type-safe API calls for admin user management operations.
 * All endpoints require ADMIN role authentication.
 */

import type {
  AdminUserDetailsResponse,
  AdminUserListResponse,
  AdminUserResponse,
  ImpersonationTokenResponse,
  ListUsersQuery,
  UserRole,
  UserStatus,
} from '@lingx/shared';

// Re-export shared types for consumers
export type {
  AdminUserDetailsResponse,
  AdminUserListResponse,
  AdminUserResponse,
  ImpersonationTokenResponse,
  ListUsersQuery,
  UserRole,
  UserStatus,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * API Error class for admin API errors
 */
export class AdminApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

/**
 * User activity entry from admin API
 */
export interface UserActivity {
  id: string;
  projectId: string;
  type: string;
  metadata: unknown;
  count: number;
  createdAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * User activity response
 */
export interface UserActivityResponse {
  activities: UserActivity[];
}

/**
 * Internal fetch wrapper with error handling
 */
async function fetchAdminApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = { ...options.headers };
  if (options.body && !(headers as Record<string, string>)['Content-Type']) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let error;
    try {
      error = await response.json();
    } catch (parseError) {
      // Log parse failures for debugging - helps identify proxy/server issues
      console.error(
        `[AdminAPI] Failed to parse error response for ${endpoint}:`,
        parseError,
        `Status: ${response.status}`
      );
      error = {
        code: 'PARSE_ERROR',
        message: `Request failed with status ${response.status}`,
      };
    }
    throw new AdminApiError(
      response.status,
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred'
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Build query string from params object
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============================================
// ADMIN API
// ============================================

export const adminApi = {
  /**
   * List all users with filters and pagination
   */
  listUsers: (params?: Partial<ListUsersQuery>) =>
    fetchAdminApi<AdminUserListResponse>(`/api/admin/users${buildQueryString(params || {})}`),

  /**
   * Get detailed user information
   */
  getUserDetails: (userId: string) =>
    fetchAdminApi<AdminUserDetailsResponse>(`/api/admin/users/${userId}`),

  /**
   * Get user's recent activity
   */
  getUserActivity: (userId: string, limit?: number) =>
    fetchAdminApi<UserActivityResponse>(
      `/api/admin/users/${userId}/activity${buildQueryString({ limit })}`
    ),

  /**
   * Disable a user account
   * Immediately logs them out and prevents future logins.
   */
  disableUser: (userId: string) =>
    fetchAdminApi<void>(`/api/admin/users/${userId}/disable`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * Enable a disabled user account
   * Allows them to log in again.
   */
  enableUser: (userId: string) =>
    fetchAdminApi<void>(`/api/admin/users/${userId}/enable`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * Start a 1-hour impersonation session.
   * Sets impersonation cookies - no need to handle tokens client-side.
   * After this call succeeds, redirect user to start browsing as the impersonated user.
   */
  impersonateUser: (userId: string) =>
    fetchAdminApi<{ message: string; expiresAt: string }>(
      `/api/admin/users/${userId}/impersonate`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    ),
};
