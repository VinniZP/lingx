/**
 * Branch Service Unit Tests
 *
 * Tests for branch CRUD operations with copy-on-write functionality.
 * Per Design Doc: AC-WEB-012, AC-WEB-013
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { BranchService } from '../../src/services/branch.service.js';
import { ProjectService } from '../../src/services/project.service.js';
import { SpaceService } from '../../src/services/space.service.js';

describe('BranchService', () => {
  let branchService: BranchService;
  let spaceService: SpaceService;
  let projectService: ProjectService;
  let testUserId: string;
  let testProjectId: string;
  let testSpaceId: string;
  let mainBranchId: string;

  beforeAll(async () => {
    branchService = new BranchService(prisma);
    spaceService = new SpaceService(prisma);
    projectService = new ProjectService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data - order matters due to foreign keys
    // Use 'branch-unit-' prefix unique to this test file to avoid conflicts
    await prisma.translation.deleteMany({
      where: {
        key: {
          branch: {
            space: {
              slug: { startsWith: 'branch-unit-' },
            },
          },
        },
      },
    });
    await prisma.translationKey.deleteMany({
      where: {
        branch: {
          space: {
            slug: { startsWith: 'branch-unit-' },
          },
        },
      },
    });
    await prisma.branch.deleteMany({
      where: {
        space: {
          slug: { startsWith: 'branch-unit-' },
        },
      },
    });
    await prisma.space.deleteMany({
      where: { slug: { startsWith: 'branch-unit-' } },
    });
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { slug: { startsWith: 'branch-unit-proj-' } } },
          { user: { email: { startsWith: 'branch-unit-' } } },
        ],
      },
    });
    await prisma.project.deleteMany({
      where: { slug: { startsWith: 'branch-unit-proj-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'branch-unit-' } },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `branch-unit-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test project
    const project = await projectService.create({
      name: 'Test Project',
      slug: `branch-unit-proj-${Date.now()}`,
      languageCodes: ['en', 'es', 'fr'],
      defaultLanguage: 'en',
      userId: testUserId,
    });
    testProjectId = project.id;

    // Create test space (auto-creates main branch)
    const space = await spaceService.create({
      name: 'Test Space',
      slug: `branch-unit-${Date.now()}`,
      projectId: testProjectId,
    });
    testSpaceId = space.id;

    // Get main branch
    const branches = await prisma.branch.findMany({
      where: { spaceId: testSpaceId },
    });
    mainBranchId = branches[0].id;
  });

  describe('create', () => {
    it('should create branch with copy-on-write from source', async () => {
      // Add keys and translations to main branch
      await prisma.translationKey.createMany({
        data: [
          { branchId: mainBranchId, name: 'key.one', description: 'First key' },
          { branchId: mainBranchId, name: 'key.two', description: 'Second key' },
        ],
      });

      const keys = await prisma.translationKey.findMany({
        where: { branchId: mainBranchId },
      });

      for (const key of keys) {
        await prisma.translation.createMany({
          data: [
            { keyId: key.id, language: 'en', value: `${key.name} en` },
            { keyId: key.id, language: 'es', value: `${key.name} es` },
          ],
        });
      }

      // Create branch from main
      const newBranch = await branchService.create({
        name: 'feature-test',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });

      expect(newBranch.name).toBe('feature-test');
      expect(newBranch.slug).toBe('feature-test');
      expect(newBranch.sourceBranchId).toBe(mainBranchId);
      expect(newBranch.isDefault).toBe(false);
      expect(newBranch.keyCount).toBe(2);

      // Verify keys were copied
      const copiedKeys = await prisma.translationKey.findMany({
        where: { branchId: newBranch.id },
        include: { translations: true },
      });

      expect(copiedKeys.length).toBe(2);
      expect(copiedKeys[0].translations.length).toBe(2);
      expect(copiedKeys[1].translations.length).toBe(2);
    });

    it('should create branch with empty source', async () => {
      const newBranch = await branchService.create({
        name: 'feature-empty',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });

      expect(newBranch.keyCount).toBe(0);
    });

    it('should generate slug from name', async () => {
      const newBranch = await branchService.create({
        name: 'Feature_Name-123',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });

      expect(newBranch.slug).toBe('feature_name-123');
    });

    it('should reject duplicate branch name in same space', async () => {
      await branchService.create({
        name: 'duplicate-name',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });

      await expect(
        branchService.create({
          name: 'duplicate-name',
          spaceId: testSpaceId,
          fromBranchId: mainBranchId,
        })
      ).rejects.toThrow();
    });

    it('should throw NotFoundError for non-existent space', async () => {
      await expect(
        branchService.create({
          name: 'test',
          spaceId: 'non-existent-id',
          fromBranchId: mainBranchId,
        })
      ).rejects.toThrow('Space not found');
    });

    it('should throw NotFoundError for non-existent source branch', async () => {
      await expect(
        branchService.create({
          name: 'test',
          spaceId: testSpaceId,
          fromBranchId: 'non-existent-id',
        })
      ).rejects.toThrow('Source branch not found');
    });

    it('should reject source branch from different space', async () => {
      // Create another space
      const otherSpace = await spaceService.create({
        name: 'Other Space',
        slug: `branch-unit-other-${Date.now()}`,
        projectId: testProjectId,
      });

      const otherBranches = await prisma.branch.findMany({
        where: { spaceId: otherSpace.id },
      });

      await expect(
        branchService.create({
          name: 'test',
          spaceId: testSpaceId,
          fromBranchId: otherBranches[0].id,
        })
      ).rejects.toThrow('Source branch must belong to the same space');
    });
  });

  describe('findById', () => {
    it('should return branch with details and key count', async () => {
      // Add a key to main branch
      await prisma.translationKey.create({
        data: {
          branchId: mainBranchId,
          name: 'test.key',
        },
      });

      const found = await branchService.findById(mainBranchId);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('main');
      expect(found?.isDefault).toBe(true);
      expect(found?.keyCount).toBe(1);
      expect(found?.space).toBeDefined();
      expect(found?.space.id).toBe(testSpaceId);
      expect(found?.space.projectId).toBe(testProjectId);
    });

    it('should return null for non-existent branch', async () => {
      const found = await branchService.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findBySpaceId', () => {
    it('should return all branches for space with key counts', async () => {
      // Create additional branch
      await branchService.create({
        name: 'feature-a',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });

      const branches = await branchService.findBySpaceId(testSpaceId);

      expect(branches.length).toBe(2);
      // Default branch should be first
      expect(branches[0].isDefault).toBe(true);
      expect(branches[0].name).toBe('main');
    });

    it('should order by isDefault desc then name asc', async () => {
      await branchService.create({
        name: 'zebra',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });
      await branchService.create({
        name: 'alpha',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });

      const branches = await branchService.findBySpaceId(testSpaceId);

      expect(branches[0].name).toBe('main'); // default first
      expect(branches[1].name).toBe('alpha'); // then alphabetical
      expect(branches[2].name).toBe('zebra');
    });

    it('should return empty array for non-existent space', async () => {
      const branches = await branchService.findBySpaceId('non-existent-id');
      expect(branches).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete non-default branch', async () => {
      const branch = await branchService.create({
        name: 'to-delete',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });

      await branchService.delete(branch.id);

      const found = await branchService.findById(branch.id);
      expect(found).toBeNull();
    });

    it('should cascade delete keys and translations', async () => {
      // Create branch with keys and translations
      const branch = await branchService.create({
        name: 'with-data',
        spaceId: testSpaceId,
        fromBranchId: mainBranchId,
      });

      await prisma.translationKey.create({
        data: {
          branchId: branch.id,
          name: 'delete.key',
          translations: {
            create: [{ language: 'en', value: 'test' }],
          },
        },
      });

      await branchService.delete(branch.id);

      // Verify cascade delete
      const keys = await prisma.translationKey.findMany({
        where: { branchId: branch.id },
      });
      expect(keys).toHaveLength(0);
    });

    it('should throw ValidationError when deleting default branch', async () => {
      await expect(branchService.delete(mainBranchId)).rejects.toThrow(
        'Cannot delete the default branch'
      );
    });

    it('should throw NotFoundError for non-existent branch', async () => {
      await expect(branchService.delete('non-existent-id')).rejects.toThrow(
        'Branch not found'
      );
    });
  });

  describe('getSpaceIdByBranchId', () => {
    it('should return space ID for branch', async () => {
      const spaceId = await branchService.getSpaceIdByBranchId(mainBranchId);
      expect(spaceId).toBe(testSpaceId);
    });

    it('should return null for non-existent branch', async () => {
      const spaceId = await branchService.getSpaceIdByBranchId('non-existent-id');
      expect(spaceId).toBeNull();
    });
  });

  describe('getProjectIdByBranchId', () => {
    it('should return project ID for branch', async () => {
      const projectId = await branchService.getProjectIdByBranchId(mainBranchId);
      expect(projectId).toBe(testProjectId);
    });

    it('should return null for non-existent branch', async () => {
      const projectId = await branchService.getProjectIdByBranchId('non-existent-id');
      expect(projectId).toBeNull();
    });
  });
});
