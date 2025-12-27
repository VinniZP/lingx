const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies for JWT
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    }));
    throw new ApiError(response.status, error.code, error.message);
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
}

// Project types
export interface ProjectLanguage {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  defaultLanguage: string;
  languages: ProjectLanguage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStats {
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

// Project API
export const projectApi = {
  list: () => fetchApi<{ projects: Project[] }>('/api/projects'),

  get: (id: string) => fetchApi<Project>(`/api/projects/${id}`),

  create: (data: CreateProjectInput) =>
    fetchApi<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateProjectInput) =>
    fetchApi<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    }),

  getStats: (id: string) =>
    fetchApi<ProjectStats>(`/api/projects/${id}/stats`),
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
