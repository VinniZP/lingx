/**
 * Translation Integration Tests
 *
 * Tests for translation key and value CRUD operations via API endpoints.
 * Per Design Doc: AC-WEB-007 through AC-WEB-011
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Translation Integration Tests', () => {
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
    const testEmail = `trans-int-${testId}@example.com`;
    const testSlug = `trans-int-proj-${testId}`;

    // Clean up any stale data from previous runs
    await app.prisma.project.deleteMany({
      where: { slug: { startsWith: 'trans-int-proj-' } },
    });
    await app.prisma.user.deleteMany({
      where: { email: { startsWith: 'trans-int-' } },
    });

    // Register and login
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: testEmail,
        password: 'SecurePass123!',
        name: 'Translation Test User',
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
        name: 'Translation Test Project',
        slug: testSlug,
        languageCodes: ['en', 'es', 'fr'],
        defaultLanguage: 'en',
      },
    });
    if (projectResponse.statusCode !== 201) {
      throw new Error(`Project creation failed: ${projectResponse.body}`);
    }
    testProjectId = JSON.parse(projectResponse.body).id;

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
    mainBranchId = spaceData.branches[0].id;
  });

  describe('AC-WEB-007: Search Performance', () => {
    it('should return matching keys within 500ms for 100+ keys', async () => {
      // Create 100+ keys
      const keysToCreate = [];
      for (let i = 0; i < 120; i++) {
        keysToCreate.push({
          branchId: mainBranchId,
          name: `key.search.test.${i}`,
          description: `Search test key ${i}`,
        });
      }
      await app.prisma.translationKey.createMany({ data: keysToCreate });

      // Time the search
      const startTime = Date.now();
      const response = await app.inject({
        method: 'GET',
        url: `/api/branches/${mainBranchId}/keys?search=test.5`,
        headers: { cookie: authCookie },
      });
      const endTime = Date.now();

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.keys.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('AC-WEB-008: Multi-language Edit', () => {
    it('should return all language translations for a key', async () => {
      // Create key with translations
      const key = await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'multi.lang.test',
          description: 'Multi-language test',
        },
      });

      await app.prisma.translation.createMany({
        data: [
          { keyId: key.id, language: 'en', value: 'English value' },
          { keyId: key.id, language: 'es', value: 'Spanish value' },
          { keyId: key.id, language: 'fr', value: 'French value' },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/keys/${key.id}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.translations).toHaveLength(3);
      expect(
        body.translations.find((t: { language: string }) => t.language === 'en')?.value
      ).toBe('English value');
    });

    it('should update translations for multiple languages simultaneously', async () => {
      const key = await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'multi.update.test',
        },
      });

      // Update multiple translations at once
      const response = await app.inject({
        method: 'PUT',
        url: `/api/keys/${key.id}/translations`,
        headers: { cookie: authCookie },
        payload: {
          translations: {
            en: 'Updated English',
            es: 'Updated Spanish',
            fr: 'Updated French',
          },
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify all translations updated
      const translations = await app.prisma.translation.findMany({
        where: { keyId: key.id },
      });
      expect(translations).toHaveLength(3);
    });
  });

  describe('AC-WEB-009 & AC-WEB-010: Key Operations', () => {
    it('should persist key description', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/branches/${mainBranchId}/keys`,
        headers: { cookie: authCookie },
        payload: {
          name: 'key.with.description',
          description: 'This is a helpful description for translators',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.description).toBe(
        'This is a helpful description for translators'
      );

      // Verify persisted
      const key = await app.prisma.translationKey.findUnique({
        where: { id: body.id },
      });
      expect(key?.description).toBe(
        'This is a helpful description for translators'
      );
    });

    it('should bulk delete keys and cascade to translations', async () => {
      // Create keys with translations
      const key1 = await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'bulk.delete.1',
        },
      });
      const key2 = await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'bulk.delete.2',
        },
      });

      await app.prisma.translation.createMany({
        data: [
          { keyId: key1.id, language: 'en', value: 'Value 1' },
          { keyId: key2.id, language: 'en', value: 'Value 2' },
        ],
      });

      // Bulk delete
      const response = await app.inject({
        method: 'POST',
        url: `/api/branches/${mainBranchId}/keys/bulk-delete`,
        headers: { cookie: authCookie },
        payload: {
          keyIds: [key1.id, key2.id],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.deleted).toBe(2);

      // Verify keys deleted
      const remainingKeys = await app.prisma.translationKey.findMany({
        where: { id: { in: [key1.id, key2.id] } },
      });
      expect(remainingKeys).toHaveLength(0);

      // Verify translations cascade deleted
      const remainingTranslations = await app.prisma.translation.findMany({
        where: { keyId: { in: [key1.id, key2.id] } },
      });
      expect(remainingTranslations).toHaveLength(0);
    });
  });

  describe('CLI Support: Bulk Operations', () => {
    it('should get all translations for a branch (CLI pull)', async () => {
      // Create keys with translations
      await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'cli.test.1',
          translations: {
            create: [
              { language: 'en', value: 'Hello' },
              { language: 'es', value: 'Hola' },
            ],
          },
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/branches/${mainBranchId}/translations`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.translations).toBeDefined();
      expect(Object.keys(body.translations.en).length).toBeGreaterThan(0);
    });

    it('should bulk update translations (CLI push)', async () => {
      // Create initial key
      await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'cli.push.test',
        },
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/branches/${mainBranchId}/translations`,
        headers: { cookie: authCookie },
        payload: {
          translations: {
            en: {
              'cli.push.test': 'English from CLI',
              'cli.push.new': 'New key from CLI',
            },
            es: {
              'cli.push.test': 'Spanish from CLI',
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.updated).toBeGreaterThanOrEqual(0);
      expect(body.created).toBeGreaterThan(0);
    });
  });

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/branches/${mainBranchId}/keys`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-member access', async () => {
      const otherTestId = Date.now().toString();
      const otherEmail = `trans-int-other-${otherTestId}@example.com`;

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
        url: `/api/branches/${mainBranchId}/keys`,
        headers: { cookie: otherCookie },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
