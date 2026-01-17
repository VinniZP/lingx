/**
 * Project API Integration Tests
 *
 * Tests for project CRUD operations via HTTP endpoints.
 * Per Design Doc: AC-WEB-001, AC-WEB-002, AC-WEB-003
 */
import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

describe('Project API Integration Tests', () => {
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
    // First delete project members (they reference both projects and users)
    await app.prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { slug: { startsWith: 'test-' } } },
          { user: { email: { contains: 'project-crud' } } },
        ],
      },
    });
    // Then delete projects
    await app.prisma.project.deleteMany({
      where: { slug: { startsWith: 'test-' } },
    });
    // Delete audit logs
    await app.prisma.auditLog.deleteMany({});
    // Finally delete users
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'project-crud' } },
    });

    // Register and login to get auth cookie
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'project-crud-user@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      },
    });
    userId = JSON.parse(registerResponse.body).user.id;

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'project-crud-user@example.com',
        password: 'SecurePass123!',
      },
    });
    const tokenCookie = loginResponse.cookies.find((c) => c.name === 'token');
    authCookie = `token=${tokenCookie?.value}`;
  });

  describe('AC-WEB-001: Create Project', () => {
    it('should create project with name, slug, and languages', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Test Project',
          slug: 'test-project',
          description: 'A test project',
          languageCodes: ['en', 'es', 'fr'],
          defaultLanguage: 'en',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Test Project');
      expect(body.slug).toBe('test-project');
      expect(body.description).toBe('A test project');
      expect(body.languages).toHaveLength(3);
      expect(body.defaultLanguage).toBe('en');
    });

    it('should reject duplicate slug', async () => {
      // Create first project
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'First Project',
          slug: 'test-duplicate-slug',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });

      // Try to create second project with same slug
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Second Project',
          slug: 'test-duplicate-slug',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should reject invalid slug format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Invalid Slug Project',
          slug: 'Invalid Slug!',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        payload: {
          name: 'Unauth Project',
          slug: 'test-unauth',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('List Projects', () => {
    it('should list only user projects', async () => {
      // Create a project
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'List Test Project',
          slug: 'test-list-project',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });

      // List projects
      const response = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.projects).toBeInstanceOf(Array);
      expect(body.projects.some((p: { slug: string }) => p.slug === 'test-list-project')).toBe(
        true
      );
    });
  });

  describe('Get Project', () => {
    it('should get project by ID', async () => {
      // Create a project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Get Test Project',
          slug: 'test-get-project',
          languageCodes: ['en', 'de'],
          defaultLanguage: 'en',
        },
      });
      const { id } = JSON.parse(createResponse.body);

      // Get project
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${id}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Get Test Project');
      expect(body.languages).toHaveLength(2);
    });

    it('should reject access for non-member', async () => {
      // Create a project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Private Project',
          slug: 'test-private-project',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });
      const { id } = JSON.parse(createResponse.body);

      // Create another user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'project-crud-other@example.com',
          password: 'OtherPass123!',
        },
      });

      const otherLoginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'project-crud-other@example.com',
          password: 'OtherPass123!',
        },
      });
      const otherTokenCookie = otherLoginResponse.cookies.find((c) => c.name === 'token');
      const otherAuthCookie = `token=${otherTokenCookie?.value}`;

      // Try to get project as non-member
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${id}`,
        headers: { cookie: otherAuthCookie },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Update Project', () => {
    it('should update project name', async () => {
      // Create a project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Original Name',
          slug: 'test-update-project',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });
      const { id } = JSON.parse(createResponse.body);

      // Update project
      const response = await app.inject({
        method: 'PUT',
        url: `/api/projects/${id}`,
        headers: { cookie: authCookie },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Updated Name');
    });

    it('should update languages', async () => {
      // Create a project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Language Update Project',
          slug: 'test-lang-update-project',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });
      const { id } = JSON.parse(createResponse.body);

      // Update languages
      const response = await app.inject({
        method: 'PUT',
        url: `/api/projects/${id}`,
        headers: { cookie: authCookie },
        payload: {
          languageCodes: ['en', 'fr', 'de', 'es'],
          defaultLanguage: 'en',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.languages).toHaveLength(4);
    });
  });

  describe('Delete Project', () => {
    it('should delete project as owner', async () => {
      // Create a project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Delete Test Project',
          slug: 'test-delete-project',
          languageCodes: ['en'],
          defaultLanguage: 'en',
        },
      });
      const { id } = JSON.parse(createResponse.body);

      // Delete project
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${id}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(204);

      // Verify deletion - project no longer exists so we get 404
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/projects/${id}`,
        headers: { cookie: authCookie },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe('AC-WEB-003: Project Stats', () => {
    it('should get project statistics', async () => {
      // Create a project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { cookie: authCookie },
        payload: {
          name: 'Stats Test Project',
          slug: 'test-stats-project',
          languageCodes: ['en', 'es'],
          defaultLanguage: 'en',
        },
      });
      const { id } = JSON.parse(createResponse.body);

      // Get stats
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${id}/stats`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(id);
      expect(body.name).toBe('Stats Test Project');
      // Projects auto-create a default space on creation
      expect(body.spaces).toBe(1);
      expect(body.totalKeys).toBe(0);
      expect(body.translationsByLanguage).toBeDefined();
      expect(body.translationsByLanguage.en).toBeDefined();
      expect(body.translationsByLanguage.es).toBeDefined();
    });
  });
});
