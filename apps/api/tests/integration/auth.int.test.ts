/**
 * Authentication Integration Tests
 *
 * Tests for user registration, login, and API key management.
 * Per Design Doc: AC-WEB-020, AC-WEB-021, AC-WEB-023
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Authentication Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await app.prisma.apiKey.deleteMany({});
    await app.prisma.projectMember.deleteMany({});
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'test' } },
    });
  });

  describe('AC-WEB-020: User Registration', () => {
    it('should create user with valid email and password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.name).toBe('Test User');
      expect(body.user.password).toBeUndefined(); // Password not returned
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      // Duplicate registration
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'DifferentPass456!',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('AC-WEB-021: User Login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'login-test@example.com',
          password: 'SecurePass123!',
        },
      });
    });

    it('should return JWT in HttpOnly cookie on valid login', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login-test@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const cookies = response.cookies;
      const tokenCookie = cookies.find((c) => c.name === 'token');
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie?.httpOnly).toBe(true);
    });

    it('should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login-test@example.com',
          password: 'WrongPassword!',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('AC-WEB-023: API Key Management', () => {
    let authCookie: string;

    beforeEach(async () => {
      // Register and login to get auth cookie
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'apikey-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'apikey-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const tokenCookie = loginResponse.cookies.find((c) => c.name === 'token');
      authCookie = `token=${tokenCookie?.value}`;
    });

    it('should create unique API key and display it once', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/api-keys',
        headers: { cookie: authCookie },
        payload: {
          name: 'Test API Key',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.key).toMatch(/^lf_/); // Key prefix
      expect(body.apiKey.name).toBe('Test API Key');
      expect(body.apiKey.keyPrefix).toMatch(/^lf_/);
    });

    it('should authenticate requests with valid API key', async () => {
      // Create API key
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/api-keys',
        headers: { cookie: authCookie },
        payload: {
          name: 'Auth Test Key',
        },
      });
      const { key } = JSON.parse(createResponse.body);

      // Use API key for /auth/me endpoint
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { 'X-API-Key': key },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe('apikey-test@example.com');
    });

    it('should reject requests with revoked API key', async () => {
      // Create API key
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/api-keys',
        headers: { cookie: authCookie },
        payload: {
          name: 'Revoke Test Key',
        },
      });
      const { key, apiKey } = JSON.parse(createResponse.body);

      // Revoke API key
      await app.inject({
        method: 'DELETE',
        url: `/api/auth/api-keys/${apiKey.id}`,
        headers: { cookie: authCookie },
      });

      // Try to use revoked key
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { 'X-API-Key': key },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
