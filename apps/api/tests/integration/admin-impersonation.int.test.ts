/**
 * Admin Impersonation Integration Tests
 *
 * Tests for admin user impersonation flow.
 * Verifies that:
 * - Only admins can impersonate
 * - Impersonation token cookie works for accessing endpoints as target user
 * - Cannot impersonate self or disabled users
 * - Exit impersonation restores original admin session
 */
import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

describe('Admin Impersonation Integration Tests', () => {
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
    await app.prisma.session.deleteMany({});
    await app.prisma.apiKey.deleteMany({});
    await app.prisma.projectMember.deleteMany({});
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'impersonate-test' } },
    });
  });

  describe('Impersonation Token Generation', () => {
    it('should set impersonation cookies when admin impersonates user', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-impersonate-test@example.com',
          password: 'SecurePass123!',
          name: 'Admin User',
        },
      });

      // Make user an admin
      await app.prisma.user.update({
        where: { email: 'admin-impersonate-test@example.com' },
        data: { role: 'ADMIN' },
      });

      // Login as admin
      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'target-impersonate-test@example.com',
          password: 'SecurePass123!',
          name: 'Target User',
        },
      });

      const targetUser = await app.prisma.user.findUnique({
        where: { email: 'target-impersonate-test@example.com' },
      });

      // Impersonate target user
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser!.id}/impersonate`,
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Impersonation session started');
      expect(body.expiresAt).toBeDefined();

      // Check that impersonation cookies are set
      const impersonationToken = response.cookies.find((c) => c.name === 'impersonation_token');
      const impersonationMeta = response.cookies.find((c) => c.name === 'impersonation_meta');

      expect(impersonationToken).toBeDefined();
      expect(impersonationToken?.value.split('.').length).toBe(3); // JWT format
      expect(impersonationMeta).toBeDefined();

      // Verify metadata cookie contains correct info
      const meta = JSON.parse(decodeURIComponent(impersonationMeta!.value));
      expect(meta.userName).toBe('Target User');
      expect(meta.userEmail).toBe('target-impersonate-test@example.com');
    });

    it('should reject impersonation for non-admin users', async () => {
      // Create regular user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'regular-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const regularLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'regular-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const regularCookie = `token=${regularLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'target2-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const targetUser = await app.prisma.user.findUnique({
        where: { email: 'target2-impersonate-test@example.com' },
      });

      // Try to impersonate - should fail
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser!.id}/impersonate`,
        headers: { cookie: regularCookie },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject self-impersonation', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'self-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const admin = await app.prisma.user.update({
        where: { email: 'self-impersonate-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'self-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Try to impersonate self - should fail
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${admin.id}/impersonate`,
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('yourself');
    });

    it('should reject impersonation of disabled users', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-disabled-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      await app.prisma.user.update({
        where: { email: 'admin-disabled-impersonate-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-disabled-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create and disable target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'disabled-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const targetUser = await app.prisma.user.update({
        where: { email: 'disabled-impersonate-test@example.com' },
        data: { isDisabled: true, disabledAt: new Date() },
      });

      // Try to impersonate disabled user - should fail
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser.id}/impersonate`,
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('disabled');
    });
  });

  describe('Using Impersonation Token', () => {
    it('should access endpoints as impersonated user when impersonation_token cookie is set', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-use-impersonate-test@example.com',
          password: 'SecurePass123!',
          name: 'Admin User',
        },
      });

      await app.prisma.user.update({
        where: { email: 'admin-use-impersonate-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-use-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'target-use-impersonate-test@example.com',
          password: 'SecurePass123!',
          name: 'Target User',
        },
      });

      const targetUser = await app.prisma.user.findUnique({
        where: { email: 'target-use-impersonate-test@example.com' },
      });

      // Start impersonation (sets cookies)
      const impersonateResponse = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser!.id}/impersonate`,
        headers: { cookie: adminCookie },
      });

      const impersonationToken = impersonateResponse.cookies.find(
        (c) => c.name === 'impersonation_token'
      )?.value;

      // Use impersonation_token cookie to access /auth/me
      // Include both admin token and impersonation token - impersonation takes priority
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: `${adminCookie}; impersonation_token=${impersonationToken}` },
      });

      expect(meResponse.statusCode).toBe(200);
      const meBody = JSON.parse(meResponse.body);
      expect(meBody.user.email).toBe('target-use-impersonate-test@example.com');
      expect(meBody.user.name).toBe('Target User');
    });

    it('should list projects as impersonated user (showing their projects only)', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-proj-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      await app.prisma.user.update({
        where: { email: 'admin-proj-impersonate-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-proj-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create a project for admin
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: adminCookie },
        payload: {
          name: 'Admin Project',
          slug: 'admin-project-impersonate-test',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });

      // Create target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'target-proj-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const targetUser = await app.prisma.user.findUnique({
        where: { email: 'target-proj-impersonate-test@example.com' },
      });

      // Login target user and create a project
      const targetLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'target-proj-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const targetCookie = `token=${targetLogin.cookies.find((c) => c.name === 'token')?.value}`;

      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: targetCookie },
        payload: {
          name: 'Target Project',
          slug: 'target-project-impersonate-test',
          languageCodes: ['en', 'es'],
          defaultLanguage: 'en',
        },
      });

      // Start impersonation
      const impersonateResponse = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser!.id}/impersonate`,
        headers: { cookie: adminCookie },
      });

      const impersonationToken = impersonateResponse.cookies.find(
        (c) => c.name === 'impersonation_token'
      )?.value;

      // List projects with impersonation token - should see only target's project
      const projectsResponse = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { cookie: `${adminCookie}; impersonation_token=${impersonationToken}` },
      });

      expect(projectsResponse.statusCode).toBe(200);
      const projectsBody = JSON.parse(projectsResponse.body);
      expect(projectsBody.projects.length).toBe(1);
      expect(projectsBody.projects[0].name).toBe('Target Project');
    });
  });

  describe('Exit Impersonation', () => {
    it('should clear impersonation cookies and fall back to admin session', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-exit-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      await app.prisma.user.update({
        where: { email: 'admin-exit-impersonate-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-exit-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'target-exit-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const targetUser = await app.prisma.user.findUnique({
        where: { email: 'target-exit-impersonate-test@example.com' },
      });

      // Start impersonation
      const impersonateResponse = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser!.id}/impersonate`,
        headers: { cookie: adminCookie },
      });

      const impersonationToken = impersonateResponse.cookies.find(
        (c) => c.name === 'impersonation_token'
      )?.value;

      // Verify we're impersonating
      const impersonatingCookie = `${adminCookie}; impersonation_token=${impersonationToken}`;
      const meWhileImpersonating = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: impersonatingCookie },
      });
      expect(JSON.parse(meWhileImpersonating.body).user.email).toBe(
        'target-exit-impersonate-test@example.com'
      );

      // Exit impersonation
      const exitResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/exit-impersonation',
        headers: { cookie: impersonatingCookie },
      });

      expect(exitResponse.statusCode).toBe(200);
      expect(JSON.parse(exitResponse.body).message).toBe('Exited impersonation mode');

      // Check that impersonation cookies are cleared (maxAge = 0)
      const clearedToken = exitResponse.cookies.find((c) => c.name === 'impersonation_token');
      const clearedMeta = exitResponse.cookies.find((c) => c.name === 'impersonation_meta');
      expect(clearedToken?.value).toBe('');
      expect(clearedMeta?.value).toBe('');

      // Now with just the admin token, we should be back as admin
      const meAfterExit = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: adminCookie },
      });

      expect(meAfterExit.statusCode).toBe(200);
      expect(JSON.parse(meAfterExit.body).user.email).toBe(
        'admin-exit-impersonate-test@example.com'
      );
    });
  });

  describe('Impersonation Token Claims', () => {
    it('should include correct claims in impersonation token', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-claims-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const admin = await app.prisma.user.update({
        where: { email: 'admin-claims-impersonate-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-claims-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'target-claims-impersonate-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const targetUser = await app.prisma.user.findUnique({
        where: { email: 'target-claims-impersonate-test@example.com' },
      });

      // Get impersonation token from cookie
      const impersonateResponse = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser!.id}/impersonate`,
        headers: { cookie: adminCookie },
      });

      const token = impersonateResponse.cookies.find(
        (c) => c.name === 'impersonation_token'
      )?.value;

      // Decode JWT payload (without verification) to check claims
      const parts = token!.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

      expect(payload.userId).toBe(targetUser!.id);
      expect(payload.impersonatedBy).toBe(admin.id);
      expect(payload.purpose).toBe('impersonation');
      expect(payload.exp).toBeDefined(); // Has expiry
    });
  });
});
