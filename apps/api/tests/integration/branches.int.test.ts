/**
 * Branch Integration Tests
 *
 * Tests for branch CRUD operations with copy-on-write functionality.
 * Per Design Doc: AC-WEB-012, AC-WEB-013
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Branch Integration Tests', () => {
  let app: FastifyInstance;
  let authCookie: string;
  let testProjectId: string;
  let testSpaceId: string;
  let mainBranchId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Use unique identifiers for each test run to avoid conflicts
    const testId = Date.now().toString();
    const testEmail = `branch-int-${testId}@example.com`;
    const testSlug = `branch-int-proj-${testId}`;

    // Clean up any stale data from previous runs
    await app.prisma.project.deleteMany({
      where: { slug: { startsWith: 'branch-int-proj-' } },
    });
    await app.prisma.user.deleteMany({
      where: { email: { startsWith: 'branch-int-' } },
    });

    // Register and login
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: testEmail,
        password: 'SecurePass123!',
        name: 'Branch Test User',
      },
    });
    if (registerResponse.statusCode !== 201) {
      throw new Error(`Registration failed: ${registerResponse.body}`);
    }

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testEmail,
        password: 'SecurePass123!',
      },
    });
    if (loginResponse.statusCode !== 200) {
      throw new Error(`Login failed: ${loginResponse.body}`);
    }
    const tokenCookie = loginResponse.cookies.find((c) => c.name === 'token');
    authCookie = `token=${tokenCookie?.value}`;

    // Create project
    const projectResponse = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: authCookie },
      payload: {
        name: 'Branch Test Project',
        slug: testSlug,
        languageCodes: ['en', 'es', 'fr'],
        defaultLanguage: 'en',
      },
    });
    if (projectResponse.statusCode !== 201) {
      throw new Error(`Project creation failed: ${projectResponse.body}`);
    }
    const projectData = JSON.parse(projectResponse.body);
    testProjectId = projectData.id;

    // Verify project was created and user is a member
    const projectVerify = await app.inject({
      method: 'GET',
      url: `/api/projects/${testProjectId}`,
      headers: { cookie: authCookie },
    });
    if (projectVerify.statusCode !== 200) {
      throw new Error(`Project verification failed: ${projectVerify.body}`);
    }

    // Create space (auto-creates main branch)
    const spaceResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${testProjectId}/spaces`,
      headers: { cookie: authCookie },
      payload: {
        name: 'Test Space',
        slug: 'test-space',
      },
    });
    if (spaceResponse.statusCode !== 201) {
      throw new Error(`Space creation failed: ${spaceResponse.body}`);
    }
    testSpaceId = JSON.parse(spaceResponse.body).id;

    // Get main branch ID
    const spaceDetail = await app.inject({
      method: 'GET',
      url: `/api/spaces/${testSpaceId}`,
      headers: { cookie: authCookie },
    });
    if (spaceDetail.statusCode !== 200) {
      throw new Error(`Space detail fetch failed: ${spaceDetail.body}`);
    }
    const spaceData = JSON.parse(spaceDetail.body);
    if (!spaceData.branches || spaceData.branches.length === 0) {
      throw new Error('No branches found in space');
    }
    mainBranchId = spaceData.branches[0].id;

    // Add some translation keys and translations to main branch
    await app.prisma.translationKey.createMany({
      data: [
        { branchId: mainBranchId, name: 'common.hello', description: 'Hello greeting' },
        { branchId: mainBranchId, name: 'common.goodbye', description: 'Goodbye greeting' },
        { branchId: mainBranchId, name: 'nav.home', description: 'Home link' },
      ],
    });

    const keys = await app.prisma.translationKey.findMany({
      where: { branchId: mainBranchId },
    });

    // Add translations for each key
    for (const key of keys) {
      await app.prisma.translation.createMany({
        data: [
          { keyId: key.id, language: 'en', value: `${key.name} in English` },
          { keyId: key.id, language: 'es', value: `${key.name} in Spanish` },
        ],
      });
    }
  });

  describe('AC-WEB-012: Branch Creation (Copy-on-Write)', () => {
    it('should create branch copying all keys from source branch', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: {
          name: 'feature-x',
          fromBranchId: mainBranchId,
        },
      });

      expect(response.statusCode).toBe(201);
      const branch = JSON.parse(response.body);
      expect(branch.name).toBe('feature-x');
      expect(branch.slug).toBe('feature-x');
      expect(branch.sourceBranchId).toBe(mainBranchId);

      // Verify keys were copied
      const newBranchKeys = await app.prisma.translationKey.findMany({
        where: { branchId: branch.id },
      });
      expect(newBranchKeys.length).toBe(3); // Same as source

      // Verify key names match
      const keyNames = newBranchKeys.map((k) => k.name).sort();
      expect(keyNames).toEqual(['common.goodbye', 'common.hello', 'nav.home']);
    });

    it('should copy all translations from source branch', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: {
          name: 'feature-y',
          fromBranchId: mainBranchId,
        },
      });

      expect(response.statusCode).toBe(201);
      const branch = JSON.parse(response.body);

      // Verify translations were copied
      const newBranchTranslations = await app.prisma.translation.findMany({
        where: {
          key: {
            branchId: branch.id,
          },
        },
      });

      // 3 keys x 2 languages = 6 translations
      expect(newBranchTranslations.length).toBe(6);

      // Verify translation values match source
      const enTranslations = newBranchTranslations.filter(
        (t) => t.language === 'en'
      );
      expect(enTranslations.length).toBe(3);
    });

    it('should keep source branch unchanged after branch creation', async () => {
      // Get original state
      const originalKeys = await app.prisma.translationKey.findMany({
        where: { branchId: mainBranchId },
        include: { translations: true },
      });

      // Create new branch
      await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: {
          name: 'feature-z',
          fromBranchId: mainBranchId,
        },
      });

      // Verify source branch unchanged
      const currentKeys = await app.prisma.translationKey.findMany({
        where: { branchId: mainBranchId },
        include: { translations: true },
      });

      expect(currentKeys.length).toBe(originalKeys.length);
      for (let i = 0; i < currentKeys.length; i++) {
        expect(currentKeys[i].id).toBe(originalKeys[i].id);
        expect(currentKeys[i].name).toBe(originalKeys[i].name);
        expect(currentKeys[i].translations.length).toBe(
          originalKeys[i].translations.length
        );
      }
    });
  });

  describe('Branch CRUD Operations', () => {
    it('should list branches for a space', async () => {
      // Create additional branch
      await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: {
          name: 'feature-list-test',
          fromBranchId: mainBranchId,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.branches.length).toBe(2); // main + feature

      // Verify main branch is first (isDefault sorting)
      expect(body.branches[0].isDefault).toBe(true);
      expect(body.branches[0].name).toBe('main');
    });

    it('should get branch by ID with details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/branches/${mainBranchId}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const branch = JSON.parse(response.body);
      expect(branch.id).toBe(mainBranchId);
      expect(branch.name).toBe('main');
      expect(branch.isDefault).toBe(true);
      expect(branch.space).toBeDefined();
      expect(branch.space.id).toBe(testSpaceId);
      expect(branch.keyCount).toBe(3);
    });

    it('should delete non-default branch', async () => {
      // Create a branch to delete
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: {
          name: 'feature-to-delete',
          fromBranchId: mainBranchId,
        },
      });
      const branchToDelete = JSON.parse(createResponse.body);

      // Delete it
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/branches/${branchToDelete.id}`,
        headers: { cookie: authCookie },
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify it's gone
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/branches/${branchToDelete.id}`,
        headers: { cookie: authCookie },
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it('should reject deleting default branch', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/branches/${mainBranchId}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('default');
    });

    it('should reject duplicate branch name in same space', async () => {
      // Create first branch
      await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: {
          name: 'duplicate-test',
          fromBranchId: mainBranchId,
        },
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: {
          name: 'duplicate-test',
          fromBranchId: mainBranchId,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/spaces/${testSpaceId}/branches`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-member access', async () => {
      const otherTestId = Date.now().toString();
      const otherEmail = `branch-int-other-${otherTestId}@example.com`;

      // Register another user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: otherEmail,
          password: 'SecurePass123!',
          name: 'Other User',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: otherEmail,
          password: 'SecurePass123!',
        },
      });
      const otherCookie = `token=${loginResponse.cookies.find((c) => c.name === 'token')?.value}`;

      const response = await app.inject({
        method: 'GET',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: otherCookie },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
