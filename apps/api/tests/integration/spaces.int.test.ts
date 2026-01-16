/**
 * Space API Integration Tests
 *
 * Tests for space CRUD operations via HTTP endpoints.
 * Per Design Doc: AC-WEB-004, AC-WEB-005, AC-WEB-006
 */
import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

describe('Space API Integration Tests', () => {
  let app: FastifyInstance;
  let authCookie: string;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test - order matters due to foreign keys
    // Delete all data related to test projects
    await app.prisma.activity.deleteMany({
      where: {
        project: { slug: { startsWith: 'test-space-' } },
      },
    });
    await app.prisma.translation.deleteMany({
      where: {
        key: { branch: { space: { project: { slug: { startsWith: 'test-space-' } } } } },
      },
    });
    await app.prisma.translationKey.deleteMany({
      where: {
        branch: { space: { project: { slug: { startsWith: 'test-space-' } } } },
      },
    });
    await app.prisma.branch.deleteMany({
      where: {
        space: { project: { slug: { startsWith: 'test-space-' } } },
      },
    });
    await app.prisma.space.deleteMany({
      where: {
        project: { slug: { startsWith: 'test-space-' } },
      },
    });
    await app.prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { slug: { startsWith: 'test-space-' } } },
          { user: { email: { contains: 'space-crud' } } },
        ],
      },
    });
    await app.prisma.project.deleteMany({
      where: { slug: { startsWith: 'test-space-' } },
    });
    await app.prisma.auditLog.deleteMany({});
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'space-crud' } },
    });

    // Register and login to get auth cookie
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'space-crud-user@example.com',
        password: 'SecurePass123!',
        name: 'Space Test User',
      },
    });
    userId = JSON.parse(registerResponse.body).user.id;

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'space-crud-user@example.com',
        password: 'SecurePass123!',
      },
    });
    const tokenCookie = loginResponse.cookies.find((c) => c.name === 'token');
    authCookie = `token=${tokenCookie?.value}`;

    // Create a test project
    const projectResponse = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: authCookie },
      payload: {
        name: 'Space Test Project',
        slug: 'test-space-project',
        description: 'A project for testing spaces',
        languageCodes: ['en', 'es'],
        defaultLanguage: 'en',
      },
    });
    projectId = JSON.parse(projectResponse.body).id;
  });

  describe('AC-WEB-004: Create Space', () => {
    it('should create space with name, slug, and description', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
        payload: {
          name: 'Test Space',
          slug: 'test-space',
          description: 'A test space',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Test Space');
      expect(body.slug).toBe('test-space');
      expect(body.description).toBe('A test space');
      expect(body.id).toBeDefined();
    });

    it('should auto-create main branch when creating space', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
        payload: {
          name: 'Space With Branch',
          slug: 'space-with-branch',
        },
      });
      const spaceId = JSON.parse(createResponse.body).id;

      // Get space with branches
      const response = await app.inject({
        method: 'GET',
        url: `/api/spaces/${spaceId}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.branches).toHaveLength(1);
      expect(body.branches[0].name).toBe('main');
      expect(body.branches[0].isDefault).toBe(true);
    });

    it('should reject duplicate slug in same project', async () => {
      // Create first space
      await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
        payload: {
          name: 'First Space',
          slug: 'duplicate-slug',
        },
      });

      // Try to create second space with same slug
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
        payload: {
          name: 'Second Space',
          slug: 'duplicate-slug',
        },
      });

      // FieldValidationError returns 409 Conflict
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors[0].field).toBe('slug');
    });

    it('should reject when user is not a project member', async () => {
      // Create another user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'space-crud-other@example.com',
          password: 'SecurePass123!',
          name: 'Other User',
        },
      });

      const otherLoginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'space-crud-other@example.com',
          password: 'SecurePass123!',
        },
      });
      const otherTokenCookie = otherLoginResponse.cookies.find((c) => c.name === 'token');
      const otherAuthCookie = `token=${otherTokenCookie?.value}`;

      // Try to create space as non-member
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: otherAuthCookie },
        payload: {
          name: 'Unauthorized Space',
          slug: 'unauthorized-space',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('AC-WEB-005: List Spaces', () => {
    it('should list all spaces for a project', async () => {
      // Create multiple spaces
      await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
        payload: { name: 'Space One', slug: 'space-one' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
        payload: { name: 'Space Two', slug: 'space-two' },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // 2 created + 1 default space from project creation = 3
      expect(body.spaces.length).toBeGreaterThanOrEqual(2);
    });

    it('should support project lookup by slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/projects/test-space-project/spaces',
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('AC-WEB-006: Get, Update, Delete Space', () => {
    let spaceId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
        payload: {
          name: 'Test Space',
          slug: 'test-space-crud',
          description: 'Initial description',
        },
      });
      spaceId = JSON.parse(response.body).id;
    });

    it('should get space by ID with branches', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/spaces/${spaceId}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(spaceId);
      expect(body.name).toBe('Test Space');
      expect(body.branches).toBeDefined();
    });

    it('should update space name', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/spaces/${spaceId}`,
        headers: { cookie: authCookie },
        payload: {
          name: 'Updated Space Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Updated Space Name');
    });

    it('should update space description', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/spaces/${spaceId}`,
        headers: { cookie: authCookie },
        payload: {
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.description).toBe('Updated description');
    });

    it('should delete space', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/spaces/${spaceId}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(204);

      // Verify space is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/spaces/${spaceId}`,
        headers: { cookie: authCookie },
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it('should get space statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/spaces/${spaceId}/stats`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(spaceId);
      expect(body.name).toBe('Test Space');
      expect(body.branches).toBeDefined();
      expect(body.totalKeys).toBeDefined();
      expect(body.translationsByLanguage).toBeDefined();
    });

    it('should return 404 for non-existent space', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/spaces/non-existent-id',
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/spaces`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject delete when user has DEVELOPER role', async () => {
      // Create a space to delete
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/spaces`,
        headers: { cookie: authCookie },
        payload: {
          name: 'Space To Delete',
          slug: 'space-to-delete',
        },
      });
      const spaceId = JSON.parse(createResponse.body).id;

      // Create another user with DEVELOPER role
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'space-crud-developer@example.com',
          password: 'SecurePass123!',
          name: 'Developer User',
        },
      });

      const developerLoginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'space-crud-developer@example.com',
          password: 'SecurePass123!',
        },
      });
      const developerTokenCookie = developerLoginResponse.cookies.find((c) => c.name === 'token');
      const developerAuthCookie = `token=${developerTokenCookie?.value}`;
      const developerUserId = JSON.parse(developerLoginResponse.body).user.id;

      // Add developer to project with DEVELOPER role
      await app.prisma.projectMember.create({
        data: {
          projectId,
          userId: developerUserId,
          role: 'DEVELOPER',
        },
      });

      // Try to delete space as developer - should be rejected
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/spaces/${spaceId}`,
        headers: { cookie: developerAuthCookie },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
