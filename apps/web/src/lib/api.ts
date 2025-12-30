import type {
  FieldError,
  ProjectResponse,
  ProjectWithStats,
  ConflictEntry,
  BranchDiffResponse,
} from '@localeflow/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  public fieldErrors?: FieldError[];

  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    fieldErrors?: FieldError[]
  ) {
    super(message);
    this.name = 'ApiError';
    this.fieldErrors = fieldErrors;
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Only set Content-Type for requests with a body
  const headers: HeadersInit = { ...options.headers };
  if (options.body) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies for JWT
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    }));
    throw new ApiError(
      response.status,
      error.code,
      error.message,
      error.fieldErrors
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    fetchApi<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchApi<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    fetchApi<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}), // Fastify requires body when Content-Type is application/json
    }),

  me: () =>
    fetchApi<{ user: User }>('/api/auth/me'),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'DEVELOPER' | 'MANAGER' | 'ADMIN';
  avatarUrl: string | null;
  createdAt?: string;
}

// Project types (ProjectLanguage, ProjectResponse, ProjectStatsEmbedded, ProjectWithStats are from @localeflow/shared)

/** Legacy detailed stats - used by /api/projects/:id/stats */
export interface ProjectStatsDetailed {
  id: string;
  name: string;
  spaces: number;
  totalKeys: number;
  translationsByLanguage: Record<
    string,
    {
      translated: number;
      total: number;
      percentage: number;
    }
  >;
}

export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  languageCodes: string[];
  defaultLanguage: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  languageCodes?: string[];
  defaultLanguage?: string;
}

// Project Tree type for sidebar navigation
export interface ProjectTreeBranch {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  keyCount: number;
}

export interface ProjectTreeSpace {
  id: string;
  name: string;
  slug: string;
  branches: ProjectTreeBranch[];
}

export interface ProjectTree {
  id: string;
  name: string;
  slug: string;
  spaces: ProjectTreeSpace[];
}

// Dashboard API
import type { DashboardStats, Activity, ActivityChange } from '@localeflow/shared';

export const dashboardApi = {
  getStats: () => fetchApi<DashboardStats>('/api/dashboard/stats'),
};

// Re-export for convenience
export type { DashboardStats, Activity, ActivityChange };

// Activity API
export const activityApi = {
  /** Get user activities across all projects (dashboard feed) */
  getUserActivities: (params?: { limit?: number; cursor?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    const queryString = query.toString();
    return fetchApi<{ activities: Activity[]; nextCursor?: string }>(
      `/api/activity${queryString ? `?${queryString}` : ''}`
    );
  },

  /** Get full audit trail for an activity */
  getActivityChanges: (activityId: string, params?: { limit?: number; cursor?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    const queryString = query.toString();
    return fetchApi<{ changes: ActivityChange[]; nextCursor?: string; total: number }>(
      `/api/activity/${activityId}/changes${queryString ? `?${queryString}` : ''}`
    );
  },
};

// Project API
export const projectApi = {
  list: () => fetchApi<{ projects: ProjectWithStats[] }>('/api/projects'),

  get: (id: string) => fetchApi<ProjectResponse>(`/api/projects/${id}`),

  create: (data: CreateProjectInput) =>
    fetchApi<ProjectResponse>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateProjectInput) =>
    fetchApi<ProjectResponse>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    }),

  getStats: (id: string) =>
    fetchApi<ProjectStatsDetailed>(`/api/projects/${id}/stats`),

  getTree: (id: string) =>
    fetchApi<ProjectTree>(`/api/projects/${id}/tree`),

  /** Get project-specific activities */
  getActivity: (id: string, params?: { limit?: number; cursor?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    const queryString = query.toString();
    return fetchApi<{ activities: Activity[]; nextCursor?: string }>(
      `/api/projects/${id}/activity${queryString ? `?${queryString}` : ''}`
    );
  },
};

// Space types
export interface Space {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
  spaceId?: string;
  sourceBranchId?: string | null;
  keyCount?: number;
}

export interface BranchWithSpace extends Branch {
  space: {
    id: string;
    name: string;
    slug: string;
    projectId: string;
  };
}

export interface CreateBranchInput {
  name: string;
  fromBranchId: string;
}

export interface SpaceWithBranches extends Space {
  branches: Branch[];
}

export interface SpaceStats {
  id: string;
  name: string;
  branches: number;
  totalKeys: number;
  translationsByLanguage: Record<
    string,
    {
      translated: number;
      total: number;
      percentage: number;
    }
  >;
}

export interface CreateSpaceInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateSpaceInput {
  name?: string;
  description?: string;
}

// Space API
export const spaceApi = {
  list: (projectId: string) =>
    fetchApi<{ spaces: Space[] }>(`/api/projects/${projectId}/spaces`),

  get: (id: string) => fetchApi<SpaceWithBranches>(`/api/spaces/${id}`),

  create: (projectId: string, data: CreateSpaceInput) =>
    fetchApi<Space>(`/api/projects/${projectId}/spaces`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateSpaceInput) =>
    fetchApi<Space>(`/api/spaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/spaces/${id}`, {
      method: 'DELETE',
    }),

  getStats: (id: string) => fetchApi<SpaceStats>(`/api/spaces/${id}/stats`),
};

// Branch Diff types (DiffEntry, ModifiedEntry, ConflictEntry, BranchDiffResponse are from @localeflow/shared)

export interface Resolution {
  key: string;
  resolution: 'source' | 'target' | Record<string, string>;
}

export interface MergeRequest {
  targetBranchId: string;
  resolutions?: Resolution[];
}

export interface MergeResult {
  success: boolean;
  merged: number;
  conflicts?: ConflictEntry[];
}

// Branch API
export const branchApi = {
  list: (spaceId: string) =>
    fetchApi<{ branches: Branch[] }>(`/api/spaces/${spaceId}/branches`),

  get: (id: string) => fetchApi<BranchWithSpace>(`/api/branches/${id}`),

  create: (spaceId: string, data: CreateBranchInput) =>
    fetchApi<Branch>(`/api/spaces/${spaceId}/branches`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/branches/${id}`, {
      method: 'DELETE',
    }),

  diff: (sourceBranchId: string, targetBranchId: string) =>
    fetchApi<BranchDiffResponse>(
      `/api/branches/${sourceBranchId}/diff/${targetBranchId}`
    ),

  merge: (sourceBranchId: string, request: MergeRequest) =>
    fetchApi<MergeResult>(`/api/branches/${sourceBranchId}/merge`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),
};

// Translation types
export interface Translation {
  id: string;
  language: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationKey {
  id: string;
  name: string;
  description?: string | null;
  branchId: string;
  translations: Translation[];
  createdAt: string;
  updatedAt: string;
}

export interface KeyListResult {
  keys: TranslationKey[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateKeyInput {
  name: string;
  description?: string;
}

export interface UpdateKeyInput {
  name?: string;
  description?: string;
}

// Translation API
export const translationApi = {
  listKeys: (
    branchId: string,
    params?: { search?: string; page?: number; limit?: number }
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return fetchApi<KeyListResult>(
      `/api/branches/${branchId}/keys${queryString ? `?${queryString}` : ''}`
    );
  },

  getKey: (id: string) => fetchApi<TranslationKey>(`/api/keys/${id}`),

  createKey: (branchId: string, data: CreateKeyInput) =>
    fetchApi<TranslationKey>(`/api/branches/${branchId}/keys`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateKey: (id: string, data: UpdateKeyInput) =>
    fetchApi<TranslationKey>(`/api/keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteKey: (id: string) =>
    fetchApi<void>(`/api/keys/${id}`, {
      method: 'DELETE',
    }),

  bulkDeleteKeys: (branchId: string, keyIds: string[]) =>
    fetchApi<{ deleted: number }>(
      `/api/branches/${branchId}/keys/bulk-delete`,
      {
        method: 'POST',
        body: JSON.stringify({ keyIds }),
      }
    ),

  updateKeyTranslations: (keyId: string, translations: Record<string, string>) =>
    fetchApi<TranslationKey>(`/api/keys/${keyId}/translations`, {
      method: 'PUT',
      body: JSON.stringify({ translations }),
    }),

  setTranslation: (keyId: string, lang: string, value: string) =>
    fetchApi<Translation>(`/api/keys/${keyId}/translations/${lang}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
};

// Environment types
export interface EnvironmentBranch {
  id: string;
  name: string;
  slug: string;
  spaceId: string;
  space: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface Environment {
  id: string;
  name: string;
  slug: string;
  projectId: string;
  branchId: string;
  branch: EnvironmentBranch;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentInput {
  name: string;
  slug: string;
  branchId: string;
}

export interface UpdateEnvironmentInput {
  name?: string;
}

// Environment API
export const environmentApi = {
  list: (projectId: string) =>
    fetchApi<{ environments: Environment[] }>(
      `/api/projects/${projectId}/environments`
    ),

  get: (id: string) => fetchApi<Environment>(`/api/environments/${id}`),

  create: (projectId: string, data: CreateEnvironmentInput) =>
    fetchApi<Environment>(`/api/projects/${projectId}/environments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateEnvironmentInput) =>
    fetchApi<Environment>(`/api/environments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  switchBranch: (id: string, branchId: string) =>
    fetchApi<Environment>(`/api/environments/${id}/branch`, {
      method: 'PUT',
      body: JSON.stringify({ branchId }),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/environments/${id}`, {
      method: 'DELETE',
    }),
};

// API Key types
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  revoked: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: string;
}

// API Key API
export const apiKeyApi = {
  list: () =>
    fetchApi<{ apiKeys: ApiKey[] }>('/api/auth/api-keys'),

  create: (name: string) =>
    fetchApi<CreateApiKeyResponse>('/api/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  revoke: (id: string) =>
    fetchApi<void>(`/api/auth/api-keys/${id}`, {
      method: 'DELETE',
    }),
};

// Profile types
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    inApp: boolean;
    digestFrequency: 'never' | 'daily' | 'weekly';
  };
  defaultProjectId: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'DEVELOPER' | 'MANAGER' | 'ADMIN';
  avatarUrl: string | null;
  preferences: UserPreferences;
  pendingEmailChange: string | null;
  createdAt: string;
}

export interface UpdateProfileInput {
  name?: string;
}

export interface UpdatePreferencesInput {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    digestFrequency?: 'never' | 'daily' | 'weekly';
  };
  defaultProjectId?: string | null;
}

export interface ChangeEmailInput {
  newEmail: string;
  password: string;
}

// Profile API
export const profileApi = {
  /** Get current user profile with preferences */
  get: () => fetchApi<UserProfile>('/api/profile'),

  /** Update profile (name) */
  update: (data: UpdateProfileInput) =>
    fetchApi<UserProfile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Upload avatar (FormData with 'avatar' field) */
  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_URL}/api/profile/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // Don't set Content-Type - browser will set multipart boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      }));
      throw new ApiError(response.status, error.code, error.message, error.fieldErrors);
    }

    return response.json();
  },

  /** Remove avatar */
  deleteAvatar: () =>
    fetchApi<{ message: string }>('/api/profile/avatar', {
      method: 'DELETE',
    }),

  /** Update user preferences */
  updatePreferences: (data: UpdatePreferencesInput) =>
    fetchApi<UserPreferences>('/api/profile/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Initiate email change (sends verification to new email) */
  initiateEmailChange: (data: ChangeEmailInput) =>
    fetchApi<{ message: string }>('/api/profile/email/change', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Verify email change with token */
  verifyEmailChange: (token: string) =>
    fetchApi<UserProfile>('/api/profile/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  /** Cancel pending email change */
  cancelEmailChange: () =>
    fetchApi<{ message: string }>('/api/profile/email/cancel', {
      method: 'DELETE',
    }),
};

// Security types
export interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Security API
export const securityApi = {
  /** Change password (invalidates all other sessions) */
  changePassword: (data: ChangePasswordInput) =>
    fetchApi<{ message: string }>('/api/security/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Get all active sessions */
  getSessions: () =>
    fetchApi<{ sessions: Session[] }>('/api/security/sessions'),

  /** Revoke a specific session */
  revokeSession: (sessionId: string) =>
    fetchApi<void>(`/api/security/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  /** Revoke all sessions except current */
  revokeAllOtherSessions: () =>
    fetchApi<{ message: string; revokedCount: number }>('/api/security/sessions', {
      method: 'DELETE',
    }),
};
