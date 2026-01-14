/**
 * Member Management API Client
 *
 * Type-safe API calls for project member and invitation management.
 */

import type {
  InvitationDetailsResponse,
  InviteMemberInput,
  InviteMemberResultResponse,
  ProjectInvitationResponse,
  ProjectMemberResponse,
  ProjectRole,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
} from '@lingx/shared';

// Re-export shared types for consumers
export type {
  InvitationDetailsResponse,
  InviteMemberInput,
  InviteMemberResultResponse,
  ProjectInvitationResponse,
  ProjectMemberResponse,
  ProjectRole,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * API Error class for member API errors
 */
export class MemberApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'MemberApiError';
  }
}

/**
 * Internal fetch wrapper with error handling
 */
async function fetchMemberApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        `[MemberAPI] Failed to parse error response for ${endpoint}:`,
        parseError,
        `Status: ${response.status}`
      );
      error = {
        code: 'PARSE_ERROR',
        message: `Request failed with status ${response.status}`,
      };
    }
    throw new MemberApiError(
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

// ============================================
// PROJECT MEMBER API
// ============================================

export const memberApi = {
  /**
   * List all members of a project
   */
  list: (projectId: string) =>
    fetchMemberApi<{ members: ProjectMemberResponse[] }>(`/api/projects/${projectId}/members`),

  /**
   * Update a member's role
   */
  updateRole: (projectId: string, userId: string, data: UpdateMemberRoleInput) =>
    fetchMemberApi<void>(`/api/projects/${projectId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * Remove a member from the project
   */
  remove: (projectId: string, userId: string) =>
    fetchMemberApi<void>(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),

  /**
   * Leave the project (current user)
   */
  leave: (projectId: string) =>
    fetchMemberApi<void>(`/api/projects/${projectId}/leave`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * Transfer project ownership to another member
   */
  transferOwnership: (projectId: string, data: TransferOwnershipInput) =>
    fetchMemberApi<void>(`/api/projects/${projectId}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ============================================
  // PROJECT INVITATIONS (project-scoped)
  // ============================================

  /**
   * List pending invitations for a project
   */
  listInvitations: (projectId: string) =>
    fetchMemberApi<{ invitations: ProjectInvitationResponse[] }>(
      `/api/projects/${projectId}/invitations`
    ),

  /**
   * Invite members to the project
   */
  invite: (projectId: string, data: InviteMemberInput) =>
    fetchMemberApi<InviteMemberResultResponse>(`/api/projects/${projectId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Revoke a pending invitation
   */
  revokeInvitation: (projectId: string, invitationId: string) =>
    fetchMemberApi<void>(`/api/projects/${projectId}/invitations/${invitationId}`, {
      method: 'DELETE',
    }),
};

// ============================================
// PUBLIC INVITATION API (no projectId needed)
// ============================================

export const invitationApi = {
  /**
   * Get invitation details by token (public endpoint)
   */
  getByToken: (token: string) =>
    fetchMemberApi<InvitationDetailsResponse>(`/api/invitations/${token}`),

  /**
   * Accept an invitation (requires authentication)
   */
  accept: (token: string) =>
    fetchMemberApi<void>(`/api/invitations/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
