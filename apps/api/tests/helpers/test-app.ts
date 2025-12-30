/**
 * Test Application Setup and Helpers
 *
 * Provides utilities for setting up and tearing down the Fastify
 * application for integration testing with a test database.
 */
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma, resetTestDatabase } from '../../src/lib/prisma.js';

// =============================================================================
// Test Application Factory
// =============================================================================

/**
 * Creates a Fastify application instance configured for testing.
 *
 * @returns Configured Fastify instance
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

/**
 * Closes the test application.
 *
 * @param app - Fastify instance to close
 */
export async function closeTestApp(app: FastifyInstance): Promise<void> {
  await app.close();
}

// =============================================================================
// Database Helpers
// =============================================================================

/**
 * Resets the test database by truncating all tables.
 * Use in beforeEach to ensure clean state for each test.
 */
export async function resetDatabase(): Promise<void> {
  await resetTestDatabase();
}

/**
 * Get the Prisma client for direct database operations in tests.
 */
export function getTestPrisma() {
  return prisma;
}

// =============================================================================
// Authentication Helpers
// =============================================================================

export interface TestUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthResult {
  user: TestUser;
  cookie: string;
}

/**
 * Registers a new user and returns authentication details.
 *
 * @param app - Fastify instance
 * @param userData - User registration data
 * @returns User info and auth cookie
 */
export async function registerUser(
  app: FastifyInstance,
  userData: { email: string; password: string; name?: string }
): Promise<AuthResult> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: userData,
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register user: ${response.body}`);
  }

  const body = JSON.parse(response.body);
  const cookie = extractCookie(response.headers['set-cookie']);

  return {
    user: body.user,
    cookie,
  };
}

/**
 * Logs in an existing user and returns authentication details.
 *
 * @param app - Fastify instance
 * @param credentials - Login credentials
 * @returns User info and auth cookie
 */
export async function loginUser(
  app: FastifyInstance,
  credentials: { email: string; password: string }
): Promise<AuthResult> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: credentials,
  });

  if (response.statusCode !== 200) {
    throw new Error(`Failed to login: ${response.body}`);
  }

  const body = JSON.parse(response.body);
  const cookie = extractCookie(response.headers['set-cookie']);

  return {
    user: body.user,
    cookie,
  };
}

/**
 * Extracts the auth cookie from Set-Cookie header.
 */
function extractCookie(setCookie: string | string[] | undefined): string {
  if (!setCookie) {
    throw new Error('No Set-Cookie header in response');
  }

  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  // Extract just the cookie value (before the first semicolon)
  return cookieStr.split(';')[0];
}

/**
 * Returns headers object with auth cookie for authenticated requests.
 *
 * @param cookie - Auth cookie string
 */
export function authHeaders(cookie: string): { cookie: string } {
  return { cookie };
}

/**
 * Returns headers for API key authentication.
 *
 * @param apiKey - Full API key string
 */
export function apiKeyHeaders(apiKey: string): { authorization: string } {
  return { authorization: `Bearer ${apiKey}` };
}

// =============================================================================
// Request Helpers
// =============================================================================

export interface RequestOptions {
  auth?: { cookie?: string; apiKey?: string };
  headers?: Record<string, string>;
  body?: unknown;
}

export interface TestResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Makes an authenticated GET request.
 */
export async function get<T = unknown>(
  app: FastifyInstance,
  url: string,
  options?: RequestOptions
): Promise<TestResponse<T>> {
  return makeRequest<T>(app, 'GET', url, options);
}

/**
 * Makes an authenticated POST request.
 */
export async function post<T = unknown>(
  app: FastifyInstance,
  url: string,
  body?: unknown,
  options?: RequestOptions
): Promise<TestResponse<T>> {
  return makeRequest<T>(app, 'POST', url, { ...options, body });
}

/**
 * Makes an authenticated PUT request.
 */
export async function put<T = unknown>(
  app: FastifyInstance,
  url: string,
  body?: unknown,
  options?: RequestOptions
): Promise<TestResponse<T>> {
  return makeRequest<T>(app, 'PUT', url, { ...options, body });
}

/**
 * Makes an authenticated PATCH request.
 */
export async function patch<T = unknown>(
  app: FastifyInstance,
  url: string,
  body?: unknown,
  options?: RequestOptions
): Promise<TestResponse<T>> {
  return makeRequest<T>(app, 'PATCH', url, { ...options, body });
}

/**
 * Makes an authenticated DELETE request.
 */
export async function del<T = unknown>(
  app: FastifyInstance,
  url: string,
  options?: RequestOptions
): Promise<TestResponse<T>> {
  return makeRequest<T>(app, 'DELETE', url, options);
}

/**
 * Makes an HTTP request to the test app.
 */
async function makeRequest<T>(
  app: FastifyInstance,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  options?: RequestOptions
): Promise<TestResponse<T>> {
  const headers: Record<string, string> = {
    ...options?.headers,
  };

  if (options?.auth?.cookie) {
    headers.cookie = options.auth.cookie;
  }
  if (options?.auth?.apiKey) {
    headers.authorization = `Bearer ${options.auth.apiKey}`;
  }

  const response = await app.inject({
    method,
    url,
    headers,
    payload: options?.body,
  });

  let body: T;
  try {
    body = JSON.parse(response.body) as T;
  } catch {
    body = response.body as T;
  }

  return {
    status: response.statusCode,
    body,
    headers: response.headers,
  };
}

// =============================================================================
// Fixture Helpers
// =============================================================================

/**
 * Creates a test user directly in the database.
 * Use when you need a user without going through the API.
 */
export async function createTestUser(
  data: { email: string; password?: string; name?: string; role?: string } = {
    email: 'test@example.com',
  }
): Promise<TestUser> {
  const { hashPassword } = await import('../../src/services/auth.service.js');

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: await hashPassword(data.password || 'TestPass123!'),
      name: data.name ?? null,
      role: data.role || 'user',
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Creates a test project directly in the database.
 */
export async function createTestProject(
  ownerId: string,
  data: { name?: string; slug?: string } = {}
): Promise<{
  id: string;
  name: string;
  slug: string;
}> {
  const name = data.name || 'Test Project';
  const slug = data.slug || 'test-project';

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      defaultLanguage: 'en',
      members: {
        create: {
          userId: ownerId,
          role: 'owner',
        },
      },
      languages: {
        create: [{ code: 'en', name: 'English', isDefault: true }],
      },
    },
  });

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
  };
}

// =============================================================================
// JWT Helpers
// =============================================================================

/**
 * Decodes a JWT token (without verification) for inspection.
 */
export function decodeJwt(token: string): {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
  exp: number;
  iat: number;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
  return JSON.parse(payload);
}

/**
 * Extracts JWT from a cookie string.
 */
export function extractJwtFromCookie(cookieStr: string): string {
  // Cookie format: "token=eyJ..."
  const match = cookieStr.match(/token=([^;]+)/);
  if (!match) {
    throw new Error('No token found in cookie');
  }
  return match[1];
}
