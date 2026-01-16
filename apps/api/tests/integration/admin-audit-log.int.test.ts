/**
 * Admin Audit Log Integration Tests
 *
 * Tests for audit log creation and querying.
 * Verifies that:
 * - Audit logs are created when admin actions occur (disable, enable, impersonate)
 * - Audit logs include before/after state and request context
 * - Only admins can query audit logs
 * - Filters work correctly
 */
import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

describe('Admin Audit Log Integration Tests', () => {
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
    await app.prisma.auditLog.deleteMany({});
    await app.prisma.session.deleteMany({});
    await app.prisma.apiKey.deleteMany({});
    await app.prisma.projectMember.deleteMany({});
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'audit-test' } },
    });
  });

  describe('Audit Log Creation on User Disable', () => {
    it('should create audit log entry when admin disables a user', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-audit-test@example.com',
          password: 'SecurePass123!',
          name: 'Admin User',
        },
      });

      await app.prisma.user.update({
        where: { email: 'admin-audit-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'target-audit-test@example.com',
          password: 'SecurePass123!',
          name: 'Target User',
        },
      });

      const targetUser = await app.prisma.user.findUnique({
        where: { email: 'target-audit-test@example.com' },
      });

      // Disable the user
      const disableResponse = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser!.id}/disable`,
        headers: { cookie: adminCookie },
      });

      expect(disableResponse.statusCode).toBe(204);

      // Check audit log was created
      const auditLog = await app.prisma.auditLog.findFirst({
        where: {
          action: 'USER_DISABLED',
          targetId: targetUser!.id,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.action).toBe('USER_DISABLED');
      expect(auditLog!.targetType).toBe('USER');
      expect(auditLog!.targetId).toBe(targetUser!.id);
      expect(auditLog!.beforeState).toMatchObject({ isDisabled: false });
      expect(auditLog!.afterState).toMatchObject({ isDisabled: true });
    });
  });

  describe('Audit Log Creation on User Enable', () => {
    it('should create audit log entry when admin enables a user', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-enable-audit-test@example.com',
          password: 'SecurePass123!',
          name: 'Admin User',
        },
      });

      await app.prisma.user.update({
        where: { email: 'admin-enable-audit-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-enable-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create and disable target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'disabled-enable-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const targetUser = await app.prisma.user.update({
        where: { email: 'disabled-enable-audit-test@example.com' },
        data: { isDisabled: true, disabledAt: new Date() },
      });

      // Clear any existing audit logs for clean test
      await app.prisma.auditLog.deleteMany({});

      // Enable the user
      const enableResponse = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser.id}/enable`,
        headers: { cookie: adminCookie },
      });

      expect(enableResponse.statusCode).toBe(204);

      // Check audit log was created
      const auditLog = await app.prisma.auditLog.findFirst({
        where: {
          action: 'USER_ENABLED',
          targetId: targetUser.id,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.action).toBe('USER_ENABLED');
      expect(auditLog!.beforeState).toMatchObject({ isDisabled: true });
      expect(auditLog!.afterState).toMatchObject({ isDisabled: false });
    });
  });

  describe('Audit Log Creation on Impersonation', () => {
    it('should create audit log entry when admin impersonates a user', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-impersonate-audit-test@example.com',
          password: 'SecurePass123!',
          name: 'Admin User',
        },
      });

      await app.prisma.user.update({
        where: { email: 'admin-impersonate-audit-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-impersonate-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create target user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'target-impersonate-audit-test@example.com',
          password: 'SecurePass123!',
          name: 'Target User',
        },
      });

      const targetUser = await app.prisma.user.findUnique({
        where: { email: 'target-impersonate-audit-test@example.com' },
      });

      // Impersonate the user
      const impersonateResponse = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${targetUser!.id}/impersonate`,
        headers: { cookie: adminCookie },
      });

      expect(impersonateResponse.statusCode).toBe(200);

      // Check audit log was created
      const auditLog = await app.prisma.auditLog.findFirst({
        where: {
          action: 'USER_IMPERSONATED',
          targetId: targetUser!.id,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.action).toBe('USER_IMPERSONATED');
      expect(auditLog!.targetType).toBe('USER');
      expect(auditLog!.beforeState).toMatchObject({
        email: 'target-impersonate-audit-test@example.com',
        name: 'Target User',
      });
      expect(auditLog!.metadata).toHaveProperty('tokenExpiry');
    });
  });

  describe('Audit Log Query API', () => {
    it('should allow admin to query audit logs', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-query-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const admin = await app.prisma.user.update({
        where: { email: 'admin-query-audit-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-query-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create some audit log entries directly
      await app.prisma.auditLog.createMany({
        data: [
          {
            adminId: admin.id,
            action: 'USER_DISABLED',
            targetType: 'USER',
            targetId: 'test-user-1',
            beforeState: { isDisabled: false },
            afterState: { isDisabled: true },
          },
          {
            adminId: admin.id,
            action: 'USER_ENABLED',
            targetType: 'USER',
            targetId: 'test-user-2',
            beforeState: { isDisabled: true },
            afterState: { isDisabled: false },
          },
        ],
      });

      // Query audit logs
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/audit-logs',
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.auditLogs).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should filter audit logs by action', async () => {
      // Create admin user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin-filter-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const admin = await app.prisma.user.update({
        where: { email: 'admin-filter-audit-test@example.com' },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin-filter-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const adminCookie = `token=${adminLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Create mixed audit log entries
      await app.prisma.auditLog.createMany({
        data: [
          {
            adminId: admin.id,
            action: 'USER_DISABLED',
            targetType: 'USER',
            targetId: 'test-user-3',
          },
          {
            adminId: admin.id,
            action: 'USER_ENABLED',
            targetType: 'USER',
            targetId: 'test-user-4',
          },
          {
            adminId: admin.id,
            action: 'USER_DISABLED',
            targetType: 'USER',
            targetId: 'test-user-5',
          },
        ],
      });

      // Query audit logs filtered by action
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/audit-logs?action=USER_DISABLED',
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.auditLogs).toHaveLength(2);
      expect(
        body.auditLogs.every((log: { action: string }) => log.action === 'USER_DISABLED')
      ).toBe(true);
    });

    it('should reject non-admin access to audit logs', async () => {
      // Create regular user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'regular-query-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const regularLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'regular-query-audit-test@example.com',
          password: 'SecurePass123!',
        },
      });
      const regularCookie = `token=${regularLogin.cookies.find((c) => c.name === 'token')?.value}`;

      // Try to query audit logs - should fail
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/audit-logs',
        headers: { cookie: regularCookie },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
