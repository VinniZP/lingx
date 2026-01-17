/**
 * Branch Integration Tests
 *
 * Tests for branch CRUD operations with copy-on-write functionality.
 * Per Design Doc: AC-WEB-012, AC-WEB-013, AC-WEB-014
 */
import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
    await app.prisma.auditLog.deleteMany({});
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
      const enTranslations = newBranchTranslations.filter((t) => t.language === 'en');
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
        expect(currentKeys[i].translations.length).toBe(originalKeys[i].translations.length);
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

  describe('AC-WEB-014: Branch Diff', () => {
    it('should identify added, modified, and deleted keys in diff', async () => {
      // Create feature branch from main
      const branchRes = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: { name: 'feature-diff-test', fromBranchId: mainBranchId },
      });
      expect(branchRes.statusCode).toBe(201);
      const featureBranchId = JSON.parse(branchRes.body).id;

      // Modify a key in feature branch (will be detected as conflict since branched from main)
      const featureKey = await app.prisma.translationKey.findFirst({
        where: { branchId: featureBranchId, name: 'common.hello' },
      });
      await app.prisma.translation.update({
        where: {
          keyId_language: { keyId: featureKey!.id, language: 'en' },
        },
        data: { value: 'Hi there!' },
      });

      // Add a new key in feature branch (added)
      await app.prisma.translationKey.create({
        data: {
          branchId: featureBranchId,
          name: 'feature.new_key',
          translations: {
            create: [
              { language: 'en', value: 'New Feature' },
              { language: 'es', value: 'Nueva Funcion' },
            ],
          },
        },
      });

      // Delete a key in feature branch (will appear as deleted)
      const deleteKey = await app.prisma.translationKey.findFirst({
        where: { branchId: featureBranchId, name: 'common.goodbye' },
      });
      await app.prisma.translationKey.delete({ where: { id: deleteKey!.id } });

      // Get diff: feature -> main (merging feature into main)
      const diffRes = await app.inject({
        method: 'GET',
        url: `/api/branches/${featureBranchId}/diff/${mainBranchId}`,
        headers: { cookie: authCookie },
      });

      expect(diffRes.statusCode).toBe(200);
      const diff = JSON.parse(diffRes.body);

      expect(diff.source.id).toBe(featureBranchId);
      expect(diff.target.id).toBe(mainBranchId);

      // Added: feature.new_key (in source but not in target)
      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].key).toBe('feature.new_key');
      expect(diff.added[0].translations.en).toBe('New Feature');

      // Conflicts: common.hello (modified in feature, branched from main)
      // Since feature was branched from main, any difference is a conflict
      expect(diff.conflicts).toHaveLength(1);
      expect(diff.conflicts[0].key).toBe('common.hello');
      expect(diff.conflicts[0].source.en).toBe('Hi there!');
      expect(diff.conflicts[0].target.en).toBe('common.hello in English');

      // Deleted: common.goodbye (in target but not in source)
      expect(diff.deleted).toHaveLength(1);
      expect(diff.deleted[0].key).toBe('common.goodbye');
    });

    it('should identify conflicts when same key modified in both branches', async () => {
      // Setup: Clear existing keys and add a fresh key to main branch
      await app.prisma.translationKey.deleteMany({
        where: { branchId: mainBranchId },
      });
      await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'shared.title',
          translations: {
            create: [
              { language: 'en', value: 'Original Title' },
              { language: 'es', value: 'Titulo Original' },
            ],
          },
        },
      });

      // Create feature branch from main
      const branchRes = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: { name: 'feature-conflict-test', fromBranchId: mainBranchId },
      });
      expect(branchRes.statusCode).toBe(201);
      const featureBranchId = JSON.parse(branchRes.body).id;

      // Modify the key in feature branch
      const featureKey = await app.prisma.translationKey.findFirst({
        where: { branchId: featureBranchId, name: 'shared.title' },
      });
      await app.prisma.translation.update({
        where: {
          keyId_language: { keyId: featureKey!.id, language: 'en' },
        },
        data: { value: 'Feature Title' },
      });

      // Modify the same key in main branch (causes conflict)
      const mainKey = await app.prisma.translationKey.findFirst({
        where: { branchId: mainBranchId, name: 'shared.title' },
      });
      await app.prisma.translation.update({
        where: {
          keyId_language: { keyId: mainKey!.id, language: 'en' },
        },
        data: { value: 'Updated Main Title' },
      });

      // Get diff: feature -> main
      const diffRes = await app.inject({
        method: 'GET',
        url: `/api/branches/${featureBranchId}/diff/${mainBranchId}`,
        headers: { cookie: authCookie },
      });

      expect(diffRes.statusCode).toBe(200);
      const diff = JSON.parse(diffRes.body);

      // This should be a conflict since both branches modified the same key
      expect(diff.conflicts).toHaveLength(1);
      expect(diff.conflicts[0].key).toBe('shared.title');
      expect(diff.conflicts[0].source.en).toBe('Feature Title');
      expect(diff.conflicts[0].target.en).toBe('Updated Main Title');

      // Should not be in modified (it's a conflict instead)
      expect(diff.modified).toHaveLength(0);
    });

    it('should return 404 for non-existent source branch', async () => {
      const diffRes = await app.inject({
        method: 'GET',
        url: `/api/branches/non-existent-id/diff/${mainBranchId}`,
        headers: { cookie: authCookie },
      });

      expect(diffRes.statusCode).toBe(404);
    });

    it('should return 400 if branches are from different spaces', async () => {
      // Create another space within the same test to avoid rate limiting on beforeEach
      const space2Res = await app.inject({
        method: 'POST',
        url: `/api/projects/${testProjectId}/spaces`,
        headers: { cookie: authCookie },
        payload: { name: 'Other Space', slug: 'other-space-diff-test' },
      });
      expect(space2Res.statusCode).toBe(201);
      const space2Data = JSON.parse(space2Res.body);

      // Get the branches for the new space
      const space2BranchesRes = await app.inject({
        method: 'GET',
        url: `/api/spaces/${space2Data.id}/branches`,
        headers: { cookie: authCookie },
      });
      expect(space2BranchesRes.statusCode).toBe(200);
      const space2Branches = JSON.parse(space2BranchesRes.body);
      const otherMainBranchId = space2Branches.branches[0].id;

      const diffRes = await app.inject({
        method: 'GET',
        url: `/api/branches/${mainBranchId}/diff/${otherMainBranchId}`,
        headers: { cookie: authCookie },
      });

      expect(diffRes.statusCode).toBe(400);
      const body = JSON.parse(diffRes.body);
      expect(body.message).toContain('same space');
    });
  });

  describe('AC-WEB-015: Branch Merge API', () => {
    it('should merge non-conflicting changes successfully', async () => {
      // Clear main branch keys and add fresh key
      await app.prisma.translationKey.deleteMany({
        where: { branchId: mainBranchId },
      });
      await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'existing.key',
          translations: {
            create: [{ language: 'en', value: 'Existing Value' }],
          },
        },
      });

      // Create feature branch from main
      const branchRes = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: { name: 'feature-merge-clean', fromBranchId: mainBranchId },
      });
      expect(branchRes.statusCode).toBe(201);
      const featureBranchId = JSON.parse(branchRes.body).id;

      // Add new key in feature branch
      await app.prisma.translationKey.create({
        data: {
          branchId: featureBranchId,
          name: 'feature.new_feature',
          translations: {
            create: [
              { language: 'en', value: 'New Feature Text' },
              { language: 'es', value: 'Nuevo texto de funcionalidad' },
            ],
          },
        },
      });

      // Merge feature into main
      const mergeRes = await app.inject({
        method: 'POST',
        url: `/api/branches/${featureBranchId}/merge`,
        headers: { cookie: authCookie },
        payload: { targetBranchId: mainBranchId },
      });

      expect(mergeRes.statusCode).toBe(200);
      const result = JSON.parse(mergeRes.body);
      expect(result.success).toBe(true);
      expect(result.merged).toBeGreaterThan(0);
      expect(result.conflicts).toBeUndefined();

      // Verify new key exists in main branch
      const mainKey = await app.prisma.translationKey.findFirst({
        where: { branchId: mainBranchId, name: 'feature.new_feature' },
        include: { translations: true },
      });
      expect(mainKey).not.toBeNull();
      expect(mainKey!.translations.find((t) => t.language === 'en')?.value).toBe(
        'New Feature Text'
      );
    });

    it('should return conflicts when same key modified in both branches', async () => {
      // Clear and setup: Add key to main branch
      await app.prisma.translationKey.deleteMany({
        where: { branchId: mainBranchId },
      });
      await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'shared.button',
          translations: {
            create: [{ language: 'en', value: 'Click Me' }],
          },
        },
      });

      // Create feature branch
      const branchRes = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: { name: 'feature-conflict', fromBranchId: mainBranchId },
      });
      expect(branchRes.statusCode).toBe(201);
      const featureBranchId = JSON.parse(branchRes.body).id;

      // Modify in feature branch
      const featureKey = await app.prisma.translationKey.findFirst({
        where: { branchId: featureBranchId, name: 'shared.button' },
      });
      await app.prisma.translation.update({
        where: { keyId_language: { keyId: featureKey!.id, language: 'en' } },
        data: { value: 'Press Here' },
      });

      // Modify same key in main branch
      const mainKey = await app.prisma.translationKey.findFirst({
        where: { branchId: mainBranchId, name: 'shared.button' },
      });
      await app.prisma.translation.update({
        where: { keyId_language: { keyId: mainKey!.id, language: 'en' } },
        data: { value: 'Tap to Continue' },
      });

      // Attempt merge without resolutions
      const mergeRes = await app.inject({
        method: 'POST',
        url: `/api/branches/${featureBranchId}/merge`,
        headers: { cookie: authCookie },
        payload: { targetBranchId: mainBranchId },
      });

      expect(mergeRes.statusCode).toBe(200);
      const result = JSON.parse(mergeRes.body);
      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].key).toBe('shared.button');
      expect(result.conflicts[0].source.en).toBe('Press Here');
      expect(result.conflicts[0].target.en).toBe('Tap to Continue');
    });

    it('should apply resolution choices correctly', async () => {
      // Clear and setup: Create conflict scenario
      await app.prisma.translationKey.deleteMany({
        where: { branchId: mainBranchId },
      });
      await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'resolve.test',
          translations: {
            create: [
              { language: 'en', value: 'Original' },
              { language: 'es', value: 'Original en Espanol' },
            ],
          },
        },
      });

      // Create and modify feature branch
      const branchRes = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: { name: 'feature-resolve', fromBranchId: mainBranchId },
      });
      expect(branchRes.statusCode).toBe(201);
      const featureBranchId = JSON.parse(branchRes.body).id;

      const featureKey = await app.prisma.translationKey.findFirst({
        where: { branchId: featureBranchId, name: 'resolve.test' },
      });
      await app.prisma.translation.update({
        where: { keyId_language: { keyId: featureKey!.id, language: 'en' } },
        data: { value: 'Feature Version' },
      });

      // Modify main branch
      const mainKey = await app.prisma.translationKey.findFirst({
        where: { branchId: mainBranchId, name: 'resolve.test' },
      });
      await app.prisma.translation.update({
        where: { keyId_language: { keyId: mainKey!.id, language: 'en' } },
        data: { value: 'Main Version' },
      });

      // Merge with 'source' resolution (use feature branch value)
      const mergeRes = await app.inject({
        method: 'POST',
        url: `/api/branches/${featureBranchId}/merge`,
        headers: { cookie: authCookie },
        payload: {
          targetBranchId: mainBranchId,
          resolutions: [{ key: 'resolve.test', resolution: 'source' }],
        },
      });

      expect(mergeRes.statusCode).toBe(200);
      const result = JSON.parse(mergeRes.body);
      expect(result.success).toBe(true);

      // Verify main branch has feature value
      const updatedKey = await app.prisma.translationKey.findFirst({
        where: { branchId: mainBranchId, name: 'resolve.test' },
        include: { translations: true },
      });
      expect(updatedKey!.translations.find((t) => t.language === 'en')?.value).toBe(
        'Feature Version'
      );
    });

    it('should apply custom resolution values', async () => {
      // Clear and setup conflict
      await app.prisma.translationKey.deleteMany({
        where: { branchId: mainBranchId },
      });
      await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'custom.resolve',
          translations: {
            create: [{ language: 'en', value: 'Original' }],
          },
        },
      });

      const branchRes = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: { name: 'feature-custom', fromBranchId: mainBranchId },
      });
      expect(branchRes.statusCode).toBe(201);
      const featureBranchId = JSON.parse(branchRes.body).id;

      // Modify both branches
      const featureKey = await app.prisma.translationKey.findFirst({
        where: { branchId: featureBranchId, name: 'custom.resolve' },
      });
      await app.prisma.translation.update({
        where: { keyId_language: { keyId: featureKey!.id, language: 'en' } },
        data: { value: 'Feature Value' },
      });

      const mainKey = await app.prisma.translationKey.findFirst({
        where: { branchId: mainBranchId, name: 'custom.resolve' },
      });
      await app.prisma.translation.update({
        where: { keyId_language: { keyId: mainKey!.id, language: 'en' } },
        data: { value: 'Main Value' },
      });

      // Merge with custom resolution
      const mergeRes = await app.inject({
        method: 'POST',
        url: `/api/branches/${featureBranchId}/merge`,
        headers: { cookie: authCookie },
        payload: {
          targetBranchId: mainBranchId,
          resolutions: [{ key: 'custom.resolve', resolution: { en: 'Custom Merged Value' } }],
        },
      });

      expect(mergeRes.statusCode).toBe(200);

      // Verify custom value applied
      const updatedKey = await app.prisma.translationKey.findFirst({
        where: { branchId: mainBranchId, name: 'custom.resolve' },
        include: { translations: true },
      });
      expect(updatedKey!.translations.find((t) => t.language === 'en')?.value).toBe(
        'Custom Merged Value'
      );
    });
  });

  describe('AC-WEB-016: Branch deletion after merge', () => {
    it('should allow deleting merged branch', async () => {
      // Clear and setup
      await app.prisma.translationKey.deleteMany({
        where: { branchId: mainBranchId },
      });
      await app.prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'delete.test',
          translations: {
            create: [{ language: 'en', value: 'Test' }],
          },
        },
      });

      const branchRes = await app.inject({
        method: 'POST',
        url: `/api/spaces/${testSpaceId}/branches`,
        headers: { cookie: authCookie },
        payload: { name: 'feature-to-delete', fromBranchId: mainBranchId },
      });
      expect(branchRes.statusCode).toBe(201);
      const featureBranchId = JSON.parse(branchRes.body).id;

      // Merge (no conflicts expected since no modifications)
      const mergeRes = await app.inject({
        method: 'POST',
        url: `/api/branches/${featureBranchId}/merge`,
        headers: { cookie: authCookie },
        payload: { targetBranchId: mainBranchId },
      });
      expect(mergeRes.statusCode).toBe(200);

      // Delete the merged branch
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/branches/${featureBranchId}`,
        headers: { cookie: authCookie },
      });

      expect(deleteRes.statusCode).toBe(204);

      // Verify branch is deleted
      const branch = await app.prisma.branch.findUnique({
        where: { id: featureBranchId },
      });
      expect(branch).toBeNull();
    });
  });
});
