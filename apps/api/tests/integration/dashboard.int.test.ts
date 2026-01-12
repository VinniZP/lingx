/**
 * Dashboard API Integration Tests
 *
 * Tests for dashboard statistics via HTTP endpoints.
 * Tests the DashboardRepository through the QueryBus and API layer.
 */
import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

describe('Dashboard API Integration Tests', () => {
  let app: FastifyInstance;
  let authCookie: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test - order matters due to foreign keys
    // Delete translations first
    await app.prisma.translation.deleteMany({
      where: {
        key: {
          branch: {
            space: {
              project: { slug: { startsWith: 'test-dashboard-' } },
            },
          },
        },
      },
    });

    // Delete translation keys
    await app.prisma.translationKey.deleteMany({
      where: {
        branch: {
          space: {
            project: { slug: { startsWith: 'test-dashboard-' } },
          },
        },
      },
    });

    // Delete branches
    await app.prisma.branch.deleteMany({
      where: {
        space: {
          project: { slug: { startsWith: 'test-dashboard-' } },
        },
      },
    });

    // Delete spaces
    await app.prisma.space.deleteMany({
      where: {
        project: { slug: { startsWith: 'test-dashboard-' } },
      },
    });

    // Delete project languages
    await app.prisma.projectLanguage.deleteMany({
      where: {
        project: { slug: { startsWith: 'test-dashboard-' } },
      },
    });

    // Delete project members
    await app.prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { slug: { startsWith: 'test-dashboard-' } } },
          { user: { email: { contains: 'dashboard-test' } } },
        ],
      },
    });

    // Delete projects
    await app.prisma.project.deleteMany({
      where: { slug: { startsWith: 'test-dashboard-' } },
    });

    // Delete users
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'dashboard-test' } },
    });

    // Register and login to get auth cookie
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'dashboard-test-user@example.com',
        password: 'SecurePass123!',
        name: 'Dashboard Test User',
      },
    });
    userId = JSON.parse(registerResponse.body).user.id;

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'dashboard-test-user@example.com',
        password: 'SecurePass123!',
      },
    });
    const tokenCookie = loginResponse.cookies.find((c) => c.name === 'token');
    authCookie = `token=${tokenCookie?.value}`;
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return zero stats for user with no projects', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalProjects).toBe(0);
      expect(body.totalKeys).toBe(0);
      expect(body.totalLanguages).toBe(0);
      expect(body.completionRate).toBe(0);
      expect(body.translatedKeys).toBe(0);
      expect(body.totalTranslations).toBe(0);
      expect(body.pendingApprovalCount).toBe(0);
    });

    it('should return correct project and language counts', async () => {
      // Create first project with 2 languages
      const project1Response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Dashboard Test Project 1',
          slug: 'test-dashboard-project-1',
          languageCodes: ['en', 'es'],
          defaultLanguage: 'en',
        },
      });
      expect(project1Response.statusCode).toBe(201);

      // Create second project with 3 languages (including 'en' which overlaps)
      const project2Response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Dashboard Test Project 2',
          slug: 'test-dashboard-project-2',
          languageCodes: ['en', 'fr', 'de'],
          defaultLanguage: 'en',
        },
      });
      expect(project2Response.statusCode).toBe(201);

      // Get dashboard stats
      const statsResponse = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: { cookie: authCookie },
      });

      expect(statsResponse.statusCode).toBe(200);
      const stats = JSON.parse(statsResponse.body);
      expect(stats.totalProjects).toBe(2);
      // Unique languages: en, es, fr, de = 4
      expect(stats.totalLanguages).toBe(4);
    });

    it('should return correct key and translation counts with direct database setup', async () => {
      // Create a project via API
      const projectResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Dashboard Stats Test',
          slug: 'test-dashboard-stats',
          languageCodes: ['en', 'es'],
          defaultLanguage: 'en',
        },
      });
      expect(projectResponse.statusCode).toBe(201);
      const project = JSON.parse(projectResponse.body);

      // Create space and branch directly in the database for more control
      const space = await app.prisma.space.create({
        data: {
          projectId: project.id,
          name: 'Test Space',
          slug: 'test-space',
        },
      });

      const branch = await app.prisma.branch.create({
        data: {
          spaceId: space.id,
          name: 'main',
          slug: 'main',
          isDefault: true,
        },
      });

      // Create translation keys
      const key1 = await app.prisma.translationKey.create({
        data: {
          branchId: branch.id,
          name: 'key1',
        },
      });

      const key2 = await app.prisma.translationKey.create({
        data: {
          branchId: branch.id,
          name: 'key2',
        },
      });

      // Create translations - 3 out of 4 possible (2 keys * 2 languages)
      await app.prisma.translation.createMany({
        data: [
          { keyId: key1.id, language: 'en', value: 'Key 1 English', status: 'PENDING' },
          { keyId: key1.id, language: 'es', value: 'Key 1 Spanish', status: 'APPROVED' },
          { keyId: key2.id, language: 'en', value: 'Key 2 English', status: 'PENDING' },
        ],
      });

      // Get dashboard stats
      const statsResponse = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: { cookie: authCookie },
      });

      expect(statsResponse.statusCode).toBe(200);
      const stats = JSON.parse(statsResponse.body);
      expect(stats.totalProjects).toBe(1);
      expect(stats.totalKeys).toBe(2);
      expect(stats.totalLanguages).toBe(2);
      expect(stats.totalTranslations).toBe(3);
      expect(stats.translatedKeys).toBe(2); // Both keys have at least one translation
      // Completion rate = 3 / (2 * 2) = 0.75
      expect(stats.completionRate).toBe(0.75);
      // Pending count = 2 (key1.en and key2.en are PENDING)
      expect(stats.pendingApprovalCount).toBe(2);
    });

    it('should exclude empty translations from counts', async () => {
      // Create a project via API
      const projectResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Empty Translation Test',
          slug: 'test-dashboard-empty',
          languageCodes: ['en', 'es'],
          defaultLanguage: 'en',
        },
      });
      const project = JSON.parse(projectResponse.body);

      // Create space and branch directly
      const space = await app.prisma.space.create({
        data: {
          projectId: project.id,
          name: 'Test Space',
          slug: 'test-space',
        },
      });

      const branch = await app.prisma.branch.create({
        data: {
          spaceId: space.id,
          name: 'main',
          slug: 'main',
          isDefault: true,
        },
      });

      // Create a key
      const key = await app.prisma.translationKey.create({
        data: {
          branchId: branch.id,
          name: 'empty.test',
        },
      });

      // Create translations - one with content, one empty
      await app.prisma.translation.createMany({
        data: [
          { keyId: key.id, language: 'en', value: 'Has content', status: 'PENDING' },
          { keyId: key.id, language: 'es', value: '', status: 'PENDING' }, // Empty
        ],
      });

      // Get dashboard stats
      const statsResponse = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: { cookie: authCookie },
      });

      const stats = JSON.parse(statsResponse.body);
      expect(stats.totalKeys).toBe(1);
      expect(stats.totalTranslations).toBe(1); // Only non-empty counts
      expect(stats.translatedKeys).toBe(1); // Key has at least one non-empty translation
      // Completion rate = 1 / (1 * 2) = 0.5
      expect(stats.completionRate).toBe(0.5);
      // Only 1 pending because empty translations don't count
      expect(stats.pendingApprovalCount).toBe(1);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle user with projects but no spaces gracefully', async () => {
      // Create a project without any spaces
      const projectResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'No Spaces Project',
          slug: 'test-dashboard-no-spaces',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });
      expect(projectResponse.statusCode).toBe(201);

      // Get dashboard stats
      const statsResponse = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: { cookie: authCookie },
      });

      expect(statsResponse.statusCode).toBe(200);
      const stats = JSON.parse(statsResponse.body);
      expect(stats.totalProjects).toBe(1);
      expect(stats.totalLanguages).toBe(1);
      expect(stats.totalKeys).toBe(0);
      expect(stats.totalTranslations).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });
});
