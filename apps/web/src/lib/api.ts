import type {
  BranchDiffResponse,
  ConflictEntry,
  FieldError,
  ProjectResponse,
  ProjectWithStats,
} from '@lingx/shared';

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
  // Only set Content-Type for requests with a body, and only if not already set
  const headers: HeadersInit = { ...options.headers };
  if (options.body && !(headers as Record<string, string>)['Content-Type']) {
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
    throw new ApiError(response.status, error.code, error.message, error.fieldErrors);
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

  me: () => fetchApi<{ user: User }>('/api/auth/me'),
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

// Project types (ProjectLanguage, ProjectResponse, ProjectStatsEmbedded, ProjectWithStats are from @lingx/shared)

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
import type { Activity, ActivityChange, DashboardStats } from '@lingx/shared';

export const dashboardApi = {
  getStats: () => fetchApi<DashboardStats>('/api/dashboard/stats'),
};

// Re-export for convenience
export type { Activity, ActivityChange, DashboardStats };

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

  getStats: (id: string) => fetchApi<ProjectStatsDetailed>(`/api/projects/${id}/stats`),

  getTree: (id: string) => fetchApi<ProjectTree>(`/api/projects/${id}/tree`),

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
  list: (projectId: string) => fetchApi<{ spaces: Space[] }>(`/api/projects/${projectId}/spaces`),

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

// Branch Diff types (DiffEntry, ModifiedEntry, ConflictEntry, BranchDiffResponse are from @lingx/shared)

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
  list: (spaceId: string) => fetchApi<{ branches: Branch[] }>(`/api/spaces/${spaceId}/branches`),

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
    fetchApi<BranchDiffResponse>(`/api/branches/${sourceBranchId}/diff/${targetBranchId}`),

  merge: (sourceBranchId: string, request: MergeRequest) =>
    fetchApi<MergeResult>(`/api/branches/${sourceBranchId}/merge`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),
};

// Translation types
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type KeyFilter =
  | 'all'
  | 'missing'
  | 'complete'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'warnings';
export type QualityScoreFilter = 'all' | 'excellent' | 'good' | 'needsReview' | 'unscored';

export interface EmbeddedQualityScore {
  score: number;
  accuracy: number | null;
  fluency: number | null;
  terminology: number | null;
  format: number;
  evaluationType: 'heuristic' | 'ai' | 'hybrid';
}

export interface Translation {
  id: string;
  language: string;
  value: string;
  status: ApprovalStatus;
  statusUpdatedAt: string | null;
  statusUpdatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  qualityScore: EmbeddedQualityScore | null;
}

export interface TranslationKey {
  id: string;
  name: string;
  namespace: string | null;
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
  namespace?: string | null;
  description?: string;
}

export interface UpdateKeyInput {
  name?: string;
  namespace?: string | null;
  description?: string;
}

export interface NamespaceCount {
  namespace: string | null;
  count: number;
}

// Translation API
export const translationApi = {
  listKeys: (
    branchId: string,
    params?: {
      search?: string;
      page?: number;
      limit?: number;
      filter?: KeyFilter;
      qualityFilter?: QualityScoreFilter;
      namespace?: string;
    }
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.filter && params.filter !== 'all') query.set('filter', params.filter);
    if (params?.qualityFilter && params.qualityFilter !== 'all')
      query.set('qualityFilter', params.qualityFilter);
    if (params?.namespace) query.set('namespace', params.namespace);
    const queryString = query.toString();
    return fetchApi<KeyListResult>(
      `/api/branches/${branchId}/keys${queryString ? `?${queryString}` : ''}`
    );
  },

  getNamespaces: (branchId: string) =>
    fetchApi<{ namespaces: NamespaceCount[] }>(`/api/branches/${branchId}/keys/namespaces`),

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
    fetchApi<{ deleted: number }>(`/api/branches/${branchId}/keys/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ keyIds }),
    }),

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

  // Approval workflow
  setApprovalStatus: (translationId: string, status: 'APPROVED' | 'REJECTED') =>
    fetchApi<Translation>(`/api/translations/${translationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  batchApprove: (branchId: string, translationIds: string[], status: 'APPROVED' | 'REJECTED') =>
    fetchApi<{ updated: number }>(`/api/branches/${branchId}/translations/batch-approve`, {
      method: 'POST',
      body: JSON.stringify({ translationIds, status }),
    }),

  // Bulk translate empty translations
  // Returns sync result for small batches, or jobId for large batches (async)
  bulkTranslate: (
    branchId: string,
    keyIds: string[],
    provider: 'MT' | 'AI',
    targetLanguages?: string[]
  ) =>
    fetchApi<BulkTranslateResponse>(`/api/branches/${branchId}/keys/bulk-translate`, {
      method: 'POST',
      body: JSON.stringify({ keyIds, provider, targetLanguages }),
    }),
};

// Bulk translate response types
export type BulkTranslateSyncResult = {
  translated: number;
  skipped: number;
  failed: number;
  errors?: Array<{ keyId: string; language: string; error: string }>;
};

export type BulkTranslateAsyncResult = {
  jobId: string;
  async: true;
};

export type BulkTranslateResponse = BulkTranslateSyncResult | BulkTranslateAsyncResult;

export function isBulkTranslateAsync(
  response: BulkTranslateResponse
): response is BulkTranslateAsyncResult {
  return 'async' in response && response.async === true;
}

// Job types
export interface JobProgress {
  total: number;
  processed: number;
  translated: number;
  skipped: number;
  failed: number;
  currentKey?: string;
  currentLang?: string;
  errors?: Array<{ keyId: string; keyName: string; language: string; error: string }>;
}

export interface JobStatus {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: JobProgress;
  result?: BulkTranslateSyncResult & {
    errors?: Array<{ keyId: string; keyName: string; language: string; error: string }>;
  };
  failedReason?: string;
  createdAt: string;
  finishedAt?: string;
}

// Jobs API
export const jobsApi = {
  getStatus: (jobId: string) => fetchApi<JobStatus>(`/api/jobs/${jobId}`),
  cancel: (jobId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/api/jobs/${jobId}/cancel`, {
      method: 'POST',
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
    fetchApi<{ environments: Environment[] }>(`/api/projects/${projectId}/environments`),

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
  list: () => fetchApi<{ apiKeys: ApiKey[] }>('/api/auth/api-keys'),

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
  getSessions: () => fetchApi<{ sessions: Session[] }>('/api/security/sessions'),

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

// TOTP Two-Factor Authentication types
export interface TotpSetupResponse {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

export interface TotpStatus {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
  trustedDevicesCount: number;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  tempToken: string;
}

// TOTP API
export const totpApi = {
  /** Initiate TOTP setup - returns secret and QR code URI */
  initiateSetup: () =>
    fetchApi<TotpSetupResponse>('/api/totp/setup', {
      method: 'POST',
    }),

  /** Confirm TOTP setup with verification code */
  confirmSetup: (token: string) =>
    fetchApi<{ backupCodes: string[] }>('/api/totp/setup/confirm', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  /** Cancel pending TOTP setup */
  cancelSetup: () =>
    fetchApi<void>('/api/totp/setup', {
      method: 'DELETE',
    }),

  /** Verify TOTP token during login */
  verify: (data: { tempToken: string; token: string; trustDevice?: boolean }) =>
    fetchApi<{ user: User }>('/api/totp/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Verify backup code during login */
  verifyBackup: (data: { tempToken: string; code: string; trustDevice?: boolean }) =>
    fetchApi<{ user: User; codesRemaining: number }>('/api/totp/verify/backup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Disable TOTP (requires password) */
  disable: (password: string) =>
    fetchApi<void>('/api/totp', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  /** Regenerate backup codes (requires password) */
  regenerateBackupCodes: (password: string) =>
    fetchApi<{ backupCodes: string[] }>('/api/totp/backup-codes', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  /** Get TOTP status */
  getStatus: () => fetchApi<TotpStatus>('/api/totp/status'),

  /** Revoke device trust for a session */
  revokeTrust: (sessionId: string) =>
    fetchApi<void>(`/api/totp/trust/${sessionId}`, {
      method: 'DELETE',
    }),
};

// WebAuthn / Passkey types
import type { WebAuthnCredential, WebAuthnStatusResponse } from '@lingx/shared';

export interface WebAuthnRegisterOptionsResponse {
  options: PublicKeyCredentialCreationOptions;
  challengeToken: string;
}

export interface WebAuthnAuthOptionsResponse {
  options: PublicKeyCredentialRequestOptions;
  challengeToken: string;
}

// Alias for convenience
export type WebAuthnStatus = WebAuthnStatusResponse;

// Re-export for convenience
export type { WebAuthnCredential };

// WebAuthn / Passkey API
export const webauthnApi = {
  /** Generate registration options (for adding a new passkey) */
  getRegistrationOptions: () =>
    fetchApi<WebAuthnRegisterOptionsResponse>('/api/webauthn/register/options', {
      method: 'POST',
    }),

  /** Verify registration and store the new passkey */
  verifyRegistration: (data: { name: string; challengeToken: string; response: unknown }) =>
    fetchApi<{ credential: WebAuthnCredential }>('/api/webauthn/register/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Generate authentication options (for logging in with passkey) */
  getAuthOptions: (email?: string) =>
    fetchApi<WebAuthnAuthOptionsResponse>('/api/webauthn/authenticate/options', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** Verify authentication and login */
  verifyAuth: (data: { challengeToken: string; response: unknown }) =>
    fetchApi<{ user: User }>('/api/webauthn/authenticate/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** List user's registered passkeys */
  listCredentials: () =>
    fetchApi<{ credentials: WebAuthnCredential[] }>('/api/webauthn/credentials'),

  /** Delete a passkey */
  deleteCredential: (id: string) =>
    fetchApi<{ message: string; remainingCount: number }>(`/api/webauthn/credentials/${id}`, {
      method: 'DELETE',
    }),

  /** Get WebAuthn status (hasPasskeys, canGoPasswordless, etc.) */
  getStatus: () => fetchApi<WebAuthnStatusResponse>('/api/webauthn/status'),

  /** Go passwordless (remove password, requires 2+ passkeys) */
  goPasswordless: () =>
    fetchApi<{ message: string }>('/api/webauthn/go-passwordless', {
      method: 'POST',
    }),
};

// Translation Memory types
export interface TMMatch {
  id: string;
  sourceText: string;
  targetText: string;
  similarity: number;
  matchType: 'exact' | 'fuzzy';
  usageCount: number;
  lastUsedAt: string;
}

export interface TMSearchParams {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  minSimilarity?: number;
  limit?: number;
}

export interface TMStats {
  totalEntries: number;
  languagePairs: Array<{
    sourceLanguage: string;
    targetLanguage: string;
    count: number;
  }>;
}

// Translation Memory API
export const translationMemoryApi = {
  /** Search for similar translations */
  search: (projectId: string, params: TMSearchParams) => {
    const query = new URLSearchParams();
    query.set('sourceText', params.sourceText);
    query.set('sourceLanguage', params.sourceLanguage);
    query.set('targetLanguage', params.targetLanguage);
    if (params.minSimilarity !== undefined) {
      query.set('minSimilarity', String(params.minSimilarity));
    }
    if (params.limit !== undefined) {
      query.set('limit', String(params.limit));
    }
    return fetchApi<{ matches: TMMatch[] }>(
      `/api/projects/${projectId}/tm/search?${query.toString()}`
    );
  },

  /** Record when a TM suggestion is applied */
  recordUsage: (projectId: string, entryId: string) =>
    fetchApi<{ success: boolean }>(`/api/projects/${projectId}/tm/record-usage`, {
      method: 'POST',
      body: JSON.stringify({ entryId }),
    }),

  /** Get TM statistics */
  getStats: (projectId: string) => fetchApi<TMStats>(`/api/projects/${projectId}/tm/stats`),

  /** Trigger TM reindex (MANAGER/OWNER only) */
  reindex: (projectId: string) =>
    fetchApi<{ message: string; jobId?: string }>(`/api/projects/${projectId}/tm/reindex`, {
      method: 'POST',
    }),
};

// Machine Translation Types
export type MTProvider = 'DEEPL' | 'GOOGLE_TRANSLATE';

export interface MTConfig {
  id: string;
  provider: MTProvider;
  keyPrefix: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface MTTranslateResult {
  translatedText: string;
  provider: MTProvider;
  cached: boolean;
  characterCount: number;
}

export interface MTUsageStats {
  provider: MTProvider;
  currentMonth: {
    characterCount: number;
    requestCount: number;
    cachedCount: number;
    estimatedCost: number;
  };
  allTime: {
    characterCount: number;
    requestCount: number;
  };
}

// Machine Translation API
export const machineTranslationApi = {
  /** Get MT configurations for a project */
  getConfigs: (projectId: string) =>
    fetchApi<{ configs: MTConfig[] }>(`/api/projects/${projectId}/mt/config`),

  /** Save MT provider configuration */
  saveConfig: (
    projectId: string,
    data: {
      provider: MTProvider;
      apiKey: string;
      isActive?: boolean;
      priority?: number;
    }
  ) =>
    fetchApi<MTConfig>(`/api/projects/${projectId}/mt/config`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Delete MT provider configuration */
  deleteConfig: (projectId: string, provider: MTProvider) =>
    fetchApi<{ success: boolean }>(`/api/projects/${projectId}/mt/config/${provider}`, {
      method: 'DELETE',
    }),

  /** Test MT provider connection */
  testConnection: (projectId: string, provider: MTProvider) =>
    fetchApi<{ success: boolean; error?: string }>(
      `/api/projects/${projectId}/mt/test/${provider}`,
      {
        method: 'POST',
      }
    ),

  /** Translate a single text */
  translate: (
    projectId: string,
    data: {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
      provider?: MTProvider;
    }
  ) =>
    fetchApi<MTTranslateResult>(`/api/projects/${projectId}/mt/translate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Translate a single text with AI context from related translations and glossary */
  translateWithContext: (
    projectId: string,
    data: {
      branchId: string;
      keyId: string;
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
      provider?: MTProvider;
    }
  ) =>
    fetchApi<
      MTTranslateResult & {
        context?: {
          relatedTranslations: number;
          glossaryTerms: number;
        };
      }
    >(`/api/projects/${projectId}/mt/translate/context`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Translate a single text to multiple languages at once */
  translateMulti: (
    projectId: string,
    data: {
      text: string;
      sourceLanguage: string;
      targetLanguages: string[];
      provider?: MTProvider;
    }
  ) =>
    fetchApi<{
      translations: Record<string, MTTranslateResult>;
      totalCharacters: number;
    }>(`/api/projects/${projectId}/mt/translate/multi`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Queue batch translation for multiple keys */
  translateBatch: (
    projectId: string,
    data: {
      keyIds: string[];
      targetLanguage: string;
      provider?: MTProvider;
      overwriteExisting?: boolean;
    }
  ) =>
    fetchApi<{
      message: string;
      jobId?: string;
      totalKeys: number;
      estimatedCharacters: number;
    }>(`/api/projects/${projectId}/mt/translate/batch`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Pre-translate missing translations for a branch */
  preTranslate: (
    projectId: string,
    data: {
      branchId: string;
      targetLanguages: string[];
      provider?: MTProvider;
    }
  ) =>
    fetchApi<{
      message: string;
      jobId: string;
      totalKeys: number;
      targetLanguages: string[];
      estimatedCharacters: number;
    }>(`/api/projects/${projectId}/mt/pre-translate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get MT usage statistics */
  getUsage: (projectId: string) =>
    fetchApi<{ providers: MTUsageStats[] }>(`/api/projects/${projectId}/mt/usage`),
};

// ============================================
// AI TRANSLATION TYPES
// ============================================

export type AIProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE_AI' | 'MISTRAL';

export interface AIConfig {
  id: string;
  provider: AIProvider;
  model: string;
  keyPrefix: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIContextConfig {
  includeGlossary: boolean;
  glossaryLimit: number;
  includeTM: boolean;
  tmLimit: number;
  tmMinSimilarity: number;
  includeRelatedKeys: boolean;
  relatedKeysLimit: number;
  includeDescription: boolean;
  customInstructions: string | null;
}

export interface AITranslateResult {
  text: string;
  provider: AIProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
  context?: {
    glossaryTerms: number;
    tmMatches: number;
    relatedKeys: number;
  };
}

export interface AIUsageStats {
  provider: AIProvider;
  model: string;
  currentMonth: {
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
    cacheHits: number;
    estimatedCost: number;
  };
  allTime: {
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
  };
}

// AI Translation API
export const aiTranslationApi = {
  /** Get AI configurations for a project */
  getConfigs: (projectId: string) =>
    fetchApi<{ configs: AIConfig[] }>(`/api/projects/${projectId}/ai/config`),

  /** Save AI provider configuration (apiKey optional for updates) */
  saveConfig: (
    projectId: string,
    data: {
      provider: AIProvider;
      apiKey?: string;
      model: string;
      isActive?: boolean;
      priority?: number;
    }
  ) =>
    fetchApi<AIConfig>(`/api/projects/${projectId}/ai/config`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Delete AI provider configuration */
  deleteConfig: (projectId: string, provider: AIProvider) =>
    fetchApi<{ success: boolean }>(`/api/projects/${projectId}/ai/config/${provider}`, {
      method: 'DELETE',
    }),

  /** Get AI context configuration */
  getContextConfig: (projectId: string) =>
    fetchApi<AIContextConfig>(`/api/projects/${projectId}/ai/context-config`),

  /** Update AI context configuration */
  updateContextConfig: (projectId: string, data: Partial<AIContextConfig>) =>
    fetchApi<AIContextConfig>(`/api/projects/${projectId}/ai/context-config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Test AI provider connection */
  testConnection: (projectId: string, provider: AIProvider) =>
    fetchApi<{ success: boolean; error?: string }>(
      `/api/projects/${projectId}/ai/test/${provider}`,
      {
        method: 'POST',
      }
    ),

  /** Get supported models for a provider */
  getSupportedModels: (provider: AIProvider) =>
    fetchApi<{ models: string[] }>(`/api/ai/models/${provider}`),

  /** Translate text using AI */
  translate: (
    projectId: string,
    data: {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
      keyId?: string;
      branchId?: string;
      provider?: AIProvider;
    }
  ) =>
    fetchApi<AITranslateResult>(`/api/projects/${projectId}/ai/translate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get AI usage statistics */
  getUsage: (projectId: string) =>
    fetchApi<{ providers: AIUsageStats[] }>(`/api/projects/${projectId}/ai/usage`),
};

// ============================================
// GLOSSARY API
// ============================================

export type PartOfSpeech =
  | 'NOUN'
  | 'VERB'
  | 'ADJECTIVE'
  | 'ADVERB'
  | 'PRONOUN'
  | 'PREPOSITION'
  | 'CONJUNCTION'
  | 'INTERJECTION'
  | 'DETERMINER'
  | 'OTHER';

export interface GlossaryTranslation {
  id: string;
  targetLanguage: string;
  targetTerm: string;
  notes: string | null;
}

export interface GlossaryTag {
  id: string;
  name: string;
  color: string | null;
}

export interface GlossaryEntry {
  id: string;
  sourceTerm: string;
  sourceLanguage: string;
  context: string | null;
  notes: string | null;
  partOfSpeech: PartOfSpeech | null;
  caseSensitive: boolean;
  domain: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  translations: GlossaryTranslation[];
  tags: GlossaryTag[];
}

export interface GlossaryMatch {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  context: string | null;
  notes: string | null;
  partOfSpeech: PartOfSpeech | null;
  caseSensitive: boolean;
  domain: string | null;
  matchType: 'exact' | 'partial';
  usageCount: number;
}

export interface GlossarySearchParams {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  caseSensitive?: boolean;
  limit?: number;
}

export interface GlossaryListParams {
  search?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  partOfSpeech?: PartOfSpeech;
  domain?: string;
  tagId?: string;
  page?: number;
  limit?: number;
}

export interface GlossaryStats {
  totalEntries: number;
  totalTranslations: number;
  languagePairs: Array<{
    sourceLanguage: string;
    targetLanguage: string;
    count: number;
  }>;
  topDomains: Array<{
    domain: string;
    count: number;
  }>;
  topTags: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

export interface GlossarySyncStatus {
  provider: MTProvider;
  sourceLanguage: string;
  targetLanguage: string;
  externalGlossaryId: string;
  entriesCount: number;
  lastSyncedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
  syncError: string | null;
}

export interface CreateGlossaryEntryInput {
  sourceTerm: string;
  sourceLanguage: string;
  context?: string;
  notes?: string;
  partOfSpeech?: PartOfSpeech;
  caseSensitive?: boolean;
  domain?: string;
  translations?: Array<{
    targetLanguage: string;
    targetTerm: string;
    notes?: string;
  }>;
  tagIds?: string[];
}

export interface UpdateGlossaryEntryInput {
  sourceTerm?: string;
  context?: string | null;
  notes?: string | null;
  partOfSpeech?: PartOfSpeech | null;
  caseSensitive?: boolean;
  domain?: string | null;
  tagIds?: string[];
}

// Glossary API
export const glossaryApi = {
  /** Search for glossary terms in source text */
  search: (projectId: string, params: GlossarySearchParams) => {
    const query = new URLSearchParams();
    query.set('sourceText', params.sourceText);
    query.set('sourceLanguage', params.sourceLanguage);
    query.set('targetLanguage', params.targetLanguage);
    if (params.caseSensitive !== undefined) {
      query.set('caseSensitive', String(params.caseSensitive));
    }
    if (params.limit !== undefined) {
      query.set('limit', String(params.limit));
    }
    return fetchApi<{ matches: GlossaryMatch[] }>(
      `/api/projects/${projectId}/glossary/search?${query.toString()}`
    );
  },

  /** List glossary entries */
  list: (projectId: string, params?: GlossaryListParams) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.sourceLanguage) query.set('sourceLanguage', params.sourceLanguage);
    if (params?.targetLanguage) query.set('targetLanguage', params.targetLanguage);
    if (params?.partOfSpeech) query.set('partOfSpeech', params.partOfSpeech);
    if (params?.domain) query.set('domain', params.domain);
    if (params?.tagId) query.set('tagId', params.tagId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return fetchApi<{
      entries: GlossaryEntry[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/projects/${projectId}/glossary?${query.toString()}`);
  },

  /** Get a single glossary entry */
  get: (projectId: string, entryId: string) =>
    fetchApi<GlossaryEntry>(`/api/projects/${projectId}/glossary/${entryId}`),

  /** Create a glossary entry */
  create: (projectId: string, data: CreateGlossaryEntryInput) =>
    fetchApi<GlossaryEntry>(`/api/projects/${projectId}/glossary`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a glossary entry */
  update: (projectId: string, entryId: string, data: UpdateGlossaryEntryInput) =>
    fetchApi<GlossaryEntry>(`/api/projects/${projectId}/glossary/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a glossary entry */
  delete: (projectId: string, entryId: string) =>
    fetchApi<{ success: boolean }>(`/api/projects/${projectId}/glossary/${entryId}`, {
      method: 'DELETE',
    }),

  /** Add a translation to an entry */
  addTranslation: (
    projectId: string,
    entryId: string,
    data: { targetLanguage: string; targetTerm: string; notes?: string }
  ) =>
    fetchApi<{ success: boolean }>(`/api/projects/${projectId}/glossary/${entryId}/translations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a translation */
  updateTranslation: (
    projectId: string,
    entryId: string,
    lang: string,
    data: { targetTerm: string; notes?: string | null }
  ) =>
    fetchApi<{ success: boolean }>(
      `/api/projects/${projectId}/glossary/${entryId}/translations/${lang}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),

  /** Delete a translation */
  deleteTranslation: (projectId: string, entryId: string, lang: string) =>
    fetchApi<{ success: boolean }>(
      `/api/projects/${projectId}/glossary/${entryId}/translations/${lang}`,
      {
        method: 'DELETE',
      }
    ),

  /** Record usage when a glossary term is applied */
  recordUsage: (projectId: string, entryId: string) =>
    fetchApi<{ success: boolean }>(`/api/projects/${projectId}/glossary/${entryId}/record-usage`, {
      method: 'POST',
    }),

  /** List glossary tags */
  getTags: (projectId: string) =>
    fetchApi<{
      tags: Array<GlossaryTag & { entryCount: number }>;
    }>(`/api/projects/${projectId}/glossary/tags`),

  /** Create a glossary tag */
  createTag: (projectId: string, data: { name: string; color?: string }) =>
    fetchApi<GlossaryTag>(`/api/projects/${projectId}/glossary/tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a glossary tag */
  updateTag: (projectId: string, tagId: string, data: { name?: string; color?: string | null }) =>
    fetchApi<GlossaryTag>(`/api/projects/${projectId}/glossary/tags/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a glossary tag */
  deleteTag: (projectId: string, tagId: string) =>
    fetchApi<{ success: boolean }>(`/api/projects/${projectId}/glossary/tags/${tagId}`, {
      method: 'DELETE',
    }),

  /** Get glossary statistics */
  getStats: (projectId: string) =>
    fetchApi<GlossaryStats>(`/api/projects/${projectId}/glossary/stats`),

  /** Import glossary from CSV or TBX */
  import: (
    projectId: string,
    file: File,
    format: 'csv' | 'tbx',
    overwrite?: boolean
  ): Promise<{ imported: number; skipped: number; errors: string[] }> => {
    return file.text().then((content) =>
      fetchApi<{ imported: number; skipped: number; errors: string[] }>(
        `/api/projects/${projectId}/glossary/import?format=${format}&overwrite=${overwrite ?? false}`,
        {
          method: 'POST',
          body: content,
          headers: {
            'Content-Type': 'text/plain',
          },
        }
      )
    );
  },

  /** Export glossary to CSV or TBX */
  export: (
    projectId: string,
    format: 'csv' | 'tbx',
    options?: {
      sourceLanguage?: string;
      targetLanguages?: string[];
      tagIds?: string[];
      domain?: string;
    }
  ): Promise<Blob> => {
    const query = new URLSearchParams();
    query.set('format', format);
    if (options?.sourceLanguage) query.set('sourceLanguage', options.sourceLanguage);
    if (options?.targetLanguages?.length)
      query.set('targetLanguages', options.targetLanguages.join(','));
    if (options?.tagIds?.length) query.set('tagIds', options.tagIds.join(','));
    if (options?.domain) query.set('domain', options.domain);

    return fetch(`${API_URL}/api/projects/${projectId}/glossary/export?${query.toString()}`, {
      credentials: 'include',
    }).then((res) => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    });
  },

  /** Sync glossary to MT provider */
  syncToProvider: (
    projectId: string,
    data: { provider: MTProvider; sourceLanguage: string; targetLanguage: string }
  ) =>
    fetchApi<{ message: string; jobId?: string }>(`/api/projects/${projectId}/glossary/sync`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get sync status for all providers */
  getSyncStatus: (projectId: string) =>
    fetchApi<{ syncs: GlossarySyncStatus[] }>(`/api/projects/${projectId}/glossary/sync/status`),

  /** Delete synced glossary from provider */
  deleteSyncedGlossary: (
    projectId: string,
    provider: MTProvider,
    sourceLanguage: string,
    targetLanguage: string
  ) =>
    fetchApi<{ success: boolean }>(
      `/api/projects/${projectId}/glossary/sync/${provider}?sourceLanguage=${sourceLanguage}&targetLanguage=${targetLanguage}`,
      {
        method: 'DELETE',
      }
    ),
};

// ============================================
// KEY CONTEXT API (Near-key detection)
// ============================================

export type RelationshipType = 'SAME_FILE' | 'SAME_COMPONENT' | 'SEMANTIC';

export interface RelatedKeyTranslation {
  language: string;
  value: string;
  status?: ApprovalStatus;
}

export interface RelatedKey {
  id: string;
  name: string;
  namespace: string | null;
  relationshipType: RelationshipType;
  confidence: number;
  sourceFile?: string | null;
  sourceComponent?: string | null;
  translations?: RelatedKeyTranslation[];
}

export interface RelatedKeysResponse {
  key: {
    id: string;
    name: string;
    namespace: string | null;
  };
  relationships: {
    sameFile: RelatedKey[];
    sameComponent: RelatedKey[];
    semantic: RelatedKey[];
  };
}

export interface AIContextTranslation {
  keyName: string;
  translations: Record<string, string>;
  relationshipType: RelationshipType;
  confidence: number;
}

export interface AIContextResponse {
  relatedTranslations: AIContextTranslation[];
  suggestedTerms: Array<{
    term: string;
    translation: string;
    source: 'glossary' | 'related';
  }>;
  contextPrompt: string;
}

export interface KeyContextStats {
  sameFile: number;
  sameComponent: number;
  semantic: number;
  keysWithSource: number;
}

export const keyContextApi = {
  /** Get related keys for a specific key */
  getRelatedKeys: (
    branchId: string,
    keyId: string,
    params?: {
      types?: RelationshipType[];
      limit?: number;
      includeTranslations?: boolean;
    }
  ) => {
    const query = new URLSearchParams();
    if (params?.types) query.set('types', params.types.join(','));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.includeTranslations !== undefined) {
      query.set('includeTranslations', String(params.includeTranslations));
    }
    const queryString = query.toString();
    return fetchApi<RelatedKeysResponse>(
      `/api/branches/${branchId}/keys/${keyId}/related${queryString ? `?${queryString}` : ''}`
    );
  },

  /** Get AI context for translation assistance */
  getAIContext: (branchId: string, keyId: string, targetLanguage: string) =>
    fetchApi<AIContextResponse>(
      `/api/branches/${branchId}/keys/${keyId}/ai-context?targetLanguage=${targetLanguage}`
    ),

  /** Get relationship statistics for a branch */
  getStats: (branchId: string) =>
    fetchApi<KeyContextStats>(`/api/branches/${branchId}/keys/context/stats`),

  /** Trigger semantic relationship analysis */
  analyzeRelationships: (
    branchId: string,
    options?: { types?: RelationshipType[]; minSimilarity?: number }
  ) =>
    fetchApi<{ jobId: string; status: string }>(
      `/api/branches/${branchId}/keys/analyze-relationships`,
      {
        method: 'POST',
        body: JSON.stringify({
          types: options?.types,
          minSimilarity: options?.minSimilarity,
        }),
      }
    ),
};
