/**
 * Space Service Unit Tests
 *
 * Tests for space CRUD operations.
 * Per Design Doc: AC-WEB-004, AC-WEB-005, AC-WEB-006
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { SpaceService } from '../../src/services/space.service.js';
import { ProjectService } from '../../src/services/project.service.js';

describe('SpaceService', () => {
  let spaceService: SpaceService;
  let projectService: ProjectService;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    spaceService = new SpaceService(prisma);
    projectService = new ProjectService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data - order matters due to foreign keys
    // Use 'space-test-' prefix unique to this test file to avoid conflicts
    // First delete branches, then spaces, then project members, then projects, then users
    await prisma.branch.deleteMany({
      where: {
        space: {
          slug: { startsWith: 'space-test-' },
        },
      },
    });
    await prisma.space.deleteMany({
      where: { slug: { startsWith: 'space-test-' } },
    });
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { slug: { startsWith: 'space-test-proj-' } } },
          { user: { email: { startsWith: 'space-unit-' } } },
        ],
      },
    });
    await prisma.project.deleteMany({
      where: { slug: { startsWith: 'space-test-proj-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'space-unit-' } },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `space-unit-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test project
    const project = await projectService.create({
      name: 'Test Project',
      slug: `space-test-proj-${Date.now()}`,
      languageCodes: ['en', 'es'],
      defaultLanguage: 'en',
      userId: testUserId,
    });
    testProjectId = project.id;
  });

  describe('create', () => {
    it('should create space with auto-generated main branch', async () => {
      const space = await spaceService.create({
        name: 'Frontend',
        slug: 'space-test-frontend',
        projectId: testProjectId,
      });

      expect(space.name).toBe('Frontend');
      expect(space.slug).toBe('space-test-frontend');
      expect(space.projectId).toBe(testProjectId);

      // Verify main branch was created automatically
      const branches = await prisma.branch.findMany({
        where: { spaceId: space.id },
      });
      expect(branches).toHaveLength(1);
      expect(branches[0].name).toBe('main');
      expect(branches[0].slug).toBe('main');
      expect(branches[0].isDefault).toBe(true);
      expect(branches[0].sourceBranchId).toBeNull();
    });

    it('should create space with description', async () => {
      const space = await spaceService.create({
        name: 'Backend',
        slug: 'space-test-backend',
        description: 'Backend API translations',
        projectId: testProjectId,
      });

      expect(space.name).toBe('Backend');
      expect(space.description).toBe('Backend API translations');
    });

    it('should reject duplicate slug within same project', async () => {
      await spaceService.create({
        name: 'First Space',
        slug: 'space-test-duplicate-space',
        projectId: testProjectId,
      });

      await expect(
        spaceService.create({
          name: 'Second Space',
          slug: 'space-test-duplicate-space',
          projectId: testProjectId,
        })
      ).rejects.toThrow();
    });

    it('should allow same slug in different projects', async () => {
      // Create space in first project
      await spaceService.create({
        name: 'Frontend',
        slug: 'space-test-frontend-same',
        projectId: testProjectId,
      });

      // Create another project
      const project2 = await projectService.create({
        name: 'Another Project',
        slug: `space-test-proj-2-${Date.now()}`,
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      // Same slug should work in different project
      const space2 = await spaceService.create({
        name: 'Frontend',
        slug: 'space-test-frontend-same',
        projectId: project2.id,
      });

      expect(space2.slug).toBe('space-test-frontend-same');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      await expect(
        spaceService.create({
          name: 'Test',
          slug: 'space-test-invalid-project',
          projectId: 'non-existent-id',
        })
      ).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return space with branches', async () => {
      const created = await spaceService.create({
        name: 'Find By ID Test',
        slug: 'space-test-find-by-id',
        projectId: testProjectId,
      });

      const found = await spaceService.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find By ID Test');
      expect(found?.branches).toHaveLength(1);
      expect(found?.branches[0].name).toBe('main');
    });

    it('should return null for non-existent space', async () => {
      const found = await spaceService.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should return all spaces for a project', async () => {
      await spaceService.create({
        name: 'Space 1',
        slug: 'space-test-space-1',
        projectId: testProjectId,
      });
      await spaceService.create({
        name: 'Space 2',
        slug: 'space-test-space-2',
        projectId: testProjectId,
      });

      const spaces = await spaceService.findByProjectId(testProjectId);
      expect(spaces.length).toBeGreaterThanOrEqual(2);
    });

    it('should return default space for new project', async () => {
      // Projects auto-create a "Default" space on creation
      const project2 = await projectService.create({
        name: 'New Project',
        slug: `space-test-proj-new-${Date.now()}`,
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const spaces = await spaceService.findByProjectId(project2.id);
      expect(spaces).toHaveLength(1);
      expect(spaces[0].name).toBe('Default');
    });

    it('should order spaces by name', async () => {
      await spaceService.create({
        name: 'Zebra Space',
        slug: 'space-test-zebra',
        projectId: testProjectId,
      });
      await spaceService.create({
        name: 'Alpha Space',
        slug: 'space-test-alpha',
        projectId: testProjectId,
      });

      const spaces = await spaceService.findByProjectId(testProjectId);
      const testSpaces = spaces.filter(
        (s) => s.slug === 'space-test-zebra' || s.slug === 'space-test-alpha'
      );

      // Find positions
      const alphaIndex = testSpaces.findIndex((s) => s.slug === 'space-test-alpha');
      const zebraIndex = testSpaces.findIndex((s) => s.slug === 'space-test-zebra');
      expect(alphaIndex).toBeLessThan(zebraIndex);
    });
  });

  describe('findByProjectAndSlug', () => {
    it('should return space by project and slug', async () => {
      await spaceService.create({
        name: 'Find By Slug Test',
        slug: 'space-test-find-by-slug',
        projectId: testProjectId,
      });

      const found = await spaceService.findByProjectAndSlug(
        testProjectId,
        'space-test-find-by-slug'
      );
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find By Slug Test');
      expect(found?.branches).toHaveLength(1);
    });

    it('should return null for non-existent slug', async () => {
      const found = await spaceService.findByProjectAndSlug(
        testProjectId,
        'non-existent-slug'
      );
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update space name', async () => {
      const space = await spaceService.create({
        name: 'Original Name',
        slug: 'space-test-update-name',
        projectId: testProjectId,
      });

      const updated = await spaceService.update(space.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should update space description', async () => {
      const space = await spaceService.create({
        name: 'Test Space',
        slug: 'space-test-update-desc',
        projectId: testProjectId,
      });

      const updated = await spaceService.update(space.id, {
        description: 'New description',
      });

      expect(updated.description).toBe('New description');
    });

    it('should allow setting description to empty', async () => {
      const space = await spaceService.create({
        name: 'Test Space',
        slug: 'space-test-clear-desc',
        description: 'Initial description',
        projectId: testProjectId,
      });

      const updated = await spaceService.update(space.id, {
        description: '',
      });

      expect(updated.description).toBe('');
    });

    it('should throw NotFoundError for non-existent space', async () => {
      await expect(
        spaceService.update('non-existent-id', { name: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete space and its branches', async () => {
      const space = await spaceService.create({
        name: 'Delete Test',
        slug: 'space-test-delete',
        projectId: testProjectId,
      });

      await spaceService.delete(space.id);

      // Verify space is deleted
      const found = await spaceService.findById(space.id);
      expect(found).toBeNull();

      // Verify branches are cascade deleted
      const branches = await prisma.branch.findMany({
        where: { spaceId: space.id },
      });
      expect(branches).toHaveLength(0);
    });

    it('should throw NotFoundError for non-existent space', async () => {
      await expect(spaceService.delete('non-existent-id')).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return space statistics', async () => {
      const space = await spaceService.create({
        name: 'Stats Space',
        slug: 'space-test-stats-space',
        projectId: testProjectId,
      });

      const stats = await spaceService.getStats(space.id);
      expect(stats.id).toBe(space.id);
      expect(stats.name).toBe('Stats Space');
      expect(stats.branches).toBe(1); // main branch
      expect(stats.totalKeys).toBe(0);
      expect(stats.translationsByLanguage).toBeDefined();
    });

    it('should throw NotFoundError for non-existent space', async () => {
      await expect(spaceService.getStats('non-existent-id')).rejects.toThrow();
    });
  });

  describe('getProjectIdBySpaceId', () => {
    it('should return project ID for space', async () => {
      const space = await spaceService.create({
        name: 'Project ID Test',
        slug: 'space-test-project-id',
        projectId: testProjectId,
      });

      const projectId = await spaceService.getProjectIdBySpaceId(space.id);
      expect(projectId).toBe(testProjectId);
    });

    it('should return null for non-existent space', async () => {
      const projectId = await spaceService.getProjectIdBySpaceId('non-existent-id');
      expect(projectId).toBeNull();
    });
  });
});
