import { credentialStore, type Credentials } from './auth.js';
import { loadConfig } from './config.js';

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

export class ApiClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(credentials: Credentials) {
    this.apiUrl = credentials.apiUrl;
    this.apiKey = credentials.apiKey;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      }))) as { code: string; message: string };
      throw new ApiError(response.status, errorData.code, errorData.message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export async function createApiClientFromConfig(
  projectDir: string,
  profile?: string
): Promise<ApiClient> {
  const credentials = credentialStore.getCredentials(profile);
  if (!credentials) {
    throw new Error('Not authenticated. Run "lingx auth login" first.');
  }

  // Override API URL from config if present
  const config = await loadConfig(projectDir);
  if (config.api.url && config.api.url !== credentials.apiUrl) {
    return new ApiClient({
      ...credentials,
      apiUrl: config.api.url,
    });
  }

  return new ApiClient(credentials);
}
