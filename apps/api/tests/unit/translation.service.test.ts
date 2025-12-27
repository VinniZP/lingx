/**
 * Translation Service Unit Tests
 *
 * Tests for translation key and value CRUD operations.
 * Per Design Doc: AC-WEB-007 through AC-WEB-011
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { TranslationService } from '../../src/services/translation.service.js';
import { ProjectService } from '../../src/services/project.service.js';
import { SpaceService } from '../../src/services/space.service.js';

describe('TranslationService', () => {
  let translationService: TranslationService;
  let spaceService: SpaceService;
  let projectService: ProjectService;
  let testUserId: string;
  let testProjectId: string;
  let testSpaceId: string;
  let mainBranchId: string;

  beforeAll(async () => {
    translationService = new TranslationService(prisma);
    spaceService = new SpaceService(prisma);
    projectService = new ProjectService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data - use 'trans-unit-' prefix unique to this test file
    await prisma.translation.deleteMany({
      where: {
        key: {
          branch: {
            space: {
              slug: { startsWith: 'trans-unit-' },
            },
          },
        },
      },
    });
    await prisma.translationKey.deleteMany({
      where: {
        branch: {
          space: {
            slug: { startsWith: 'trans-unit-' },
          },
        },
      },
    });
    await prisma.branch.deleteMany({
      where: {
        space: {
          slug: { startsWith: 'trans-unit-' },
        },
      },
    });
    await prisma.space.deleteMany({
      where: { slug: { startsWith: 'trans-unit-' } },
    });
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { slug: { startsWith: 'trans-unit-proj-' } } },
          { user: { email: { startsWith: 'trans-unit-' } } },
        ],
      },
    });
    await prisma.project.deleteMany({
      where: { slug: { startsWith: 'trans-unit-proj-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'trans-unit-' } },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `trans-unit-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test project
    const project = await projectService.create({
      name: 'Test Project',
      slug: `trans-unit-proj-${Date.now()}`,
      languageCodes: ['en', 'es', 'fr'],
      defaultLanguage: 'en',
      userId: testUserId,
    });
    testProjectId = project.id;

    // Create test space (auto-creates main branch)
    const space = await spaceService.create({
      name: 'Test Space',
      slug: `trans-unit-${Date.now()}`,
      projectId: testProjectId,
    });
    testSpaceId = space.id;

    // Get main branch
    const branches = await prisma.branch.findMany({
      where: { spaceId: testSpaceId },
    });
    mainBranchId = branches[0].id;
  });

  describe('createKey', () => {
    it('should create a translation key', async () => {
      const key = await translationService.createKey({
        name: 'common.hello',
        description: 'Greeting message',
        branchId: mainBranchId,
      });

      expect(key.name).toBe('common.hello');
      expect(key.description).toBe('Greeting message');
      expect(key.branchId).toBe(mainBranchId);
      expect(key.translations).toHaveLength(0);
    });

    it('should create key without description', async () => {
      const key = await translationService.createKey({
        name: 'common.goodbye',
        branchId: mainBranchId,
      });

      expect(key.name).toBe('common.goodbye');
      expect(key.description).toBeNull();
    });

    it('should reject duplicate key name in same branch', async () => {
      await translationService.createKey({
        name: 'duplicate.key',
        branchId: mainBranchId,
      });

      await expect(
        translationService.createKey({
          name: 'duplicate.key',
          branchId: mainBranchId,
        })
      ).rejects.toThrow('Key with this name already exists in the branch');
    });
  });

  describe('findKeyById', () => {
    it('should return key with translations', async () => {
      const created = await translationService.createKey({
        name: 'find.test',
        branchId: mainBranchId,
      });

      // Add a translation
      await translationService.setTranslation(created.id, 'en', 'Hello');

      const found = await translationService.findKeyById(created.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('find.test');
      expect(found?.translations).toHaveLength(1);
      expect(found?.translations[0].language).toBe('en');
      expect(found?.translations[0].value).toBe('Hello');
    });

    it('should return null for non-existent key', async () => {
      const found = await translationService.findKeyById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findKeysByBranchId', () => {
    beforeEach(async () => {
      // Create test keys
      await translationService.createKey({
        name: 'button.submit',
        description: 'Submit button',
        branchId: mainBranchId,
      });
      await translationService.createKey({
        name: 'button.cancel',
        description: 'Cancel button',
        branchId: mainBranchId,
      });
      await translationService.createKey({
        name: 'nav.home',
        description: 'Home navigation',
        branchId: mainBranchId,
      });
    });

    it('should return paginated keys with default options', async () => {
      const result = await translationService.findKeysByBranchId(mainBranchId);

      expect(result.keys).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by search term in name', async () => {
      const result = await translationService.findKeysByBranchId(mainBranchId, {
        search: 'button',
      });

      expect(result.keys).toHaveLength(2);
      expect(result.keys.every((k) => k.name.includes('button'))).toBe(true);
    });

    it('should filter by search term in description', async () => {
      const result = await translationService.findKeysByBranchId(mainBranchId, {
        search: 'navigation',
      });

      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].name).toBe('nav.home');
    });

    it('should paginate results', async () => {
      const result = await translationService.findKeysByBranchId(mainBranchId, {
        page: 1,
        limit: 2,
      });

      expect(result.keys).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should return correct second page', async () => {
      const result = await translationService.findKeysByBranchId(mainBranchId, {
        page: 2,
        limit: 2,
      });

      expect(result.keys).toHaveLength(1);
      expect(result.page).toBe(2);
    });

    it('should order keys by name', async () => {
      const result = await translationService.findKeysByBranchId(mainBranchId);

      expect(result.keys[0].name).toBe('button.cancel');
      expect(result.keys[1].name).toBe('button.submit');
      expect(result.keys[2].name).toBe('nav.home');
    });
  });

  describe('updateKey', () => {
    it('should update key name', async () => {
      const created = await translationService.createKey({
        name: 'old.name',
        branchId: mainBranchId,
      });

      const updated = await translationService.updateKey(created.id, {
        name: 'new.name',
      });

      expect(updated.name).toBe('new.name');
    });

    it('should update key description', async () => {
      const created = await translationService.createKey({
        name: 'update.desc',
        description: 'Old description',
        branchId: mainBranchId,
      });

      const updated = await translationService.updateKey(created.id, {
        description: 'New description',
      });

      expect(updated.description).toBe('New description');
    });

    it('should allow setting description to empty string', async () => {
      const created = await translationService.createKey({
        name: 'clear.desc',
        description: 'Has description',
        branchId: mainBranchId,
      });

      const updated = await translationService.updateKey(created.id, {
        description: '',
      });

      expect(updated.description).toBe('');
    });

    it('should throw NotFoundError for non-existent key', async () => {
      await expect(
        translationService.updateKey('non-existent-id', { name: 'test' })
      ).rejects.toThrow('Translation key not found');
    });

    it('should throw ConflictError when renaming to existing name', async () => {
      await translationService.createKey({
        name: 'existing.key',
        branchId: mainBranchId,
      });

      const toRename = await translationService.createKey({
        name: 'to.rename',
        branchId: mainBranchId,
      });

      await expect(
        translationService.updateKey(toRename.id, { name: 'existing.key' })
      ).rejects.toThrow('Key with this name already exists');
    });
  });

  describe('deleteKey', () => {
    it('should delete key', async () => {
      const key = await translationService.createKey({
        name: 'to.delete',
        branchId: mainBranchId,
      });

      await translationService.deleteKey(key.id);

      const found = await translationService.findKeyById(key.id);
      expect(found).toBeNull();
    });

    it('should cascade delete translations', async () => {
      const key = await translationService.createKey({
        name: 'delete.with.trans',
        branchId: mainBranchId,
      });

      await translationService.setTranslation(key.id, 'en', 'English');
      await translationService.setTranslation(key.id, 'es', 'Spanish');

      await translationService.deleteKey(key.id);

      const translations = await prisma.translation.findMany({
        where: { keyId: key.id },
      });
      expect(translations).toHaveLength(0);
    });

    it('should throw NotFoundError for non-existent key', async () => {
      await expect(
        translationService.deleteKey('non-existent-id')
      ).rejects.toThrow('Translation key not found');
    });
  });

  describe('bulkDeleteKeys', () => {
    it('should delete multiple keys', async () => {
      const key1 = await translationService.createKey({
        name: 'bulk.1',
        branchId: mainBranchId,
      });
      const key2 = await translationService.createKey({
        name: 'bulk.2',
        branchId: mainBranchId,
      });
      await translationService.createKey({
        name: 'bulk.3',
        branchId: mainBranchId,
      });

      const deleted = await translationService.bulkDeleteKeys(mainBranchId, [
        key1.id,
        key2.id,
      ]);

      expect(deleted).toBe(2);

      // Verify only those keys were deleted
      const remaining = await translationService.findKeysByBranchId(mainBranchId);
      expect(remaining.keys).toHaveLength(1);
      expect(remaining.keys[0].name).toBe('bulk.3');
    });

    it('should cascade delete translations for bulk deleted keys', async () => {
      const key1 = await translationService.createKey({
        name: 'bulk.trans.1',
        branchId: mainBranchId,
      });
      const key2 = await translationService.createKey({
        name: 'bulk.trans.2',
        branchId: mainBranchId,
      });

      await translationService.setTranslation(key1.id, 'en', 'Value 1');
      await translationService.setTranslation(key2.id, 'en', 'Value 2');

      await translationService.bulkDeleteKeys(mainBranchId, [key1.id, key2.id]);

      const translations = await prisma.translation.findMany({
        where: { keyId: { in: [key1.id, key2.id] } },
      });
      expect(translations).toHaveLength(0);
    });

    it('should throw NotFoundError if some keys not found', async () => {
      const key = await translationService.createKey({
        name: 'bulk.partial',
        branchId: mainBranchId,
      });

      await expect(
        translationService.bulkDeleteKeys(mainBranchId, [
          key.id,
          'non-existent-id',
        ])
      ).rejects.toThrow('Some translation keys not found');
    });
  });

  describe('setTranslation', () => {
    it('should create new translation', async () => {
      const key = await translationService.createKey({
        name: 'trans.create',
        branchId: mainBranchId,
      });

      const translation = await translationService.setTranslation(
        key.id,
        'en',
        'Hello World'
      );

      expect(translation.language).toBe('en');
      expect(translation.value).toBe('Hello World');
    });

    it('should update existing translation', async () => {
      const key = await translationService.createKey({
        name: 'trans.update',
        branchId: mainBranchId,
      });

      await translationService.setTranslation(key.id, 'en', 'Old value');
      const updated = await translationService.setTranslation(
        key.id,
        'en',
        'New value'
      );

      expect(updated.value).toBe('New value');

      // Verify only one translation exists
      const keyWithTrans = await translationService.findKeyById(key.id);
      expect(keyWithTrans?.translations).toHaveLength(1);
    });

    it('should throw NotFoundError for non-existent key', async () => {
      await expect(
        translationService.setTranslation('non-existent-id', 'en', 'test')
      ).rejects.toThrow('Translation key not found');
    });
  });

  describe('updateKeyTranslations', () => {
    it('should update multiple translations at once', async () => {
      const key = await translationService.createKey({
        name: 'multi.trans',
        branchId: mainBranchId,
      });

      const updated = await translationService.updateKeyTranslations(key.id, {
        en: 'English value',
        es: 'Spanish value',
        fr: 'French value',
      });

      expect(updated.translations).toHaveLength(3);
    });

    it('should create and update mixed translations', async () => {
      const key = await translationService.createKey({
        name: 'mixed.trans',
        branchId: mainBranchId,
      });

      // Create initial translation
      await translationService.setTranslation(key.id, 'en', 'Initial English');

      // Update multiple - should update en, create es
      const updated = await translationService.updateKeyTranslations(key.id, {
        en: 'Updated English',
        es: 'New Spanish',
      });

      expect(updated.translations).toHaveLength(2);
      expect(updated.translations.find((t) => t.language === 'en')?.value).toBe(
        'Updated English'
      );
      expect(updated.translations.find((t) => t.language === 'es')?.value).toBe(
        'New Spanish'
      );
    });

    it('should throw NotFoundError for non-existent key', async () => {
      await expect(
        translationService.updateKeyTranslations('non-existent-id', {
          en: 'test',
        })
      ).rejects.toThrow('Translation key not found');
    });
  });

  describe('getBranchTranslations', () => {
    it('should return all translations grouped by language', async () => {
      const key1 = await translationService.createKey({
        name: 'branch.key1',
        branchId: mainBranchId,
      });
      const key2 = await translationService.createKey({
        name: 'branch.key2',
        branchId: mainBranchId,
      });

      await translationService.setTranslation(key1.id, 'en', 'Key1 English');
      await translationService.setTranslation(key1.id, 'es', 'Key1 Spanish');
      await translationService.setTranslation(key2.id, 'en', 'Key2 English');

      const result = await translationService.getBranchTranslations(mainBranchId);

      expect(result.translations.en).toBeDefined();
      expect(result.translations.es).toBeDefined();
      expect(result.translations.en['branch.key1']).toBe('Key1 English');
      expect(result.translations.en['branch.key2']).toBe('Key2 English');
      expect(result.translations.es['branch.key1']).toBe('Key1 Spanish');
      expect(result.translations.es['branch.key2']).toBeUndefined();
    });

    it('should return empty object for branch with no translations', async () => {
      const result = await translationService.getBranchTranslations(mainBranchId);
      expect(result.translations).toEqual({});
    });
  });

  describe('bulkUpdateTranslations', () => {
    it('should create new keys and translations', async () => {
      const result = await translationService.bulkUpdateTranslations(
        mainBranchId,
        {
          en: {
            'new.key1': 'English 1',
            'new.key2': 'English 2',
          },
        }
      );

      expect(result.created).toBeGreaterThan(0);

      // Verify keys were created
      const keys = await translationService.findKeysByBranchId(mainBranchId);
      expect(keys.keys.map((k) => k.name).sort()).toEqual(['new.key1', 'new.key2']);
    });

    it('should update existing translations', async () => {
      // Create initial key and translation
      const key = await translationService.createKey({
        name: 'existing.key',
        branchId: mainBranchId,
      });
      await translationService.setTranslation(key.id, 'en', 'Old value');

      const result = await translationService.bulkUpdateTranslations(
        mainBranchId,
        {
          en: {
            'existing.key': 'New value',
          },
        }
      );

      expect(result.updated).toBe(1);

      // Verify translation was updated
      const updated = await translationService.findKeyById(key.id);
      expect(updated?.translations.find((t) => t.language === 'en')?.value).toBe(
        'New value'
      );
    });

    it('should handle multiple languages', async () => {
      const result = await translationService.bulkUpdateTranslations(
        mainBranchId,
        {
          en: {
            'multi.lang': 'English',
          },
          es: {
            'multi.lang': 'Spanish',
          },
          fr: {
            'multi.lang': 'French',
          },
        }
      );

      expect(result.created).toBeGreaterThan(0);

      // Verify all translations exist
      const keys = await translationService.findKeysByBranchId(mainBranchId);
      const key = keys.keys.find((k) => k.name === 'multi.lang');
      expect(key?.translations).toHaveLength(3);
    });
  });

  describe('helper methods', () => {
    describe('getBranchIdByKeyId', () => {
      it('should return branch ID for existing key', async () => {
        const key = await translationService.createKey({
          name: 'helper.test',
          branchId: mainBranchId,
        });

        const branchId = await translationService.getBranchIdByKeyId(key.id);
        expect(branchId).toBe(mainBranchId);
      });

      it('should return null for non-existent key', async () => {
        const branchId = await translationService.getBranchIdByKeyId(
          'non-existent-id'
        );
        expect(branchId).toBeNull();
      });
    });

    describe('getProjectIdByKeyId', () => {
      it('should return project ID for existing key', async () => {
        const key = await translationService.createKey({
          name: 'project.helper',
          branchId: mainBranchId,
        });

        const projectId = await translationService.getProjectIdByKeyId(key.id);
        expect(projectId).toBe(testProjectId);
      });

      it('should return null for non-existent key', async () => {
        const projectId = await translationService.getProjectIdByKeyId(
          'non-existent-id'
        );
        expect(projectId).toBeNull();
      });
    });
  });
});
