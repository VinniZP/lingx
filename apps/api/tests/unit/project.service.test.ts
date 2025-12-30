/**
 * Project Service Unit Tests
 *
 * Tests for project CRUD operations.
 * Per Design Doc: AC-WEB-001, AC-WEB-003
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { ProjectService } from '../../src/services/project.service.js';

describe('ProjectService', () => {
  let projectService: ProjectService;
  let testUserId: string;

  beforeAll(async () => {
    projectService = new ProjectService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data - order matters due to foreign keys
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { slug: { startsWith: 'test-' } } },
          { user: { email: { startsWith: 'project-unit-' } } },
        ],
      },
    });
    await prisma.project.deleteMany({
      where: { slug: { startsWith: 'test-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'project-unit-' } },
    });
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `project-unit-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Test User',
      },
    });
    testUserId = user.id;
  });

  describe('create', () => {
    it('should create project with languages and owner membership', async () => {
      const project = await projectService.create({
        name: 'Test Project',
        slug: 'test-project',
        languageCodes: ['en', 'es', 'fr'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      expect(project.name).toBe('Test Project');
      expect(project.slug).toBe('test-project');
      expect(project.languages).toHaveLength(3);
      expect(project.languages.find((l) => l.isDefault)?.code).toBe('en');
    });

    it('should reject duplicate slug', async () => {
      await projectService.create({
        name: 'First Project',
        slug: 'test-duplicate',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      await expect(
        projectService.create({
          name: 'Second Project',
          slug: 'test-duplicate',
          languageCodes: ['en'],
          defaultLanguage: 'en',
          userId: testUserId,
        })
      ).rejects.toThrow();
    });

    it('should reject if default language not in language codes', async () => {
      await expect(
        projectService.create({
          name: 'Invalid Project',
          slug: 'test-invalid',
          languageCodes: ['en', 'es'],
          defaultLanguage: 'fr',
          userId: testUserId,
        })
      ).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return project with languages', async () => {
      const created = await projectService.create({
        name: 'Find By ID Test',
        slug: 'test-find-by-id',
        languageCodes: ['en', 'de'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const found = await projectService.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find By ID Test');
      expect(found?.languages).toHaveLength(2);
    });

    it('should return null for non-existent project', async () => {
      const found = await projectService.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return project by slug', async () => {
      await projectService.create({
        name: 'Find By Slug Test',
        slug: 'test-find-by-slug',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const found = await projectService.findBySlug('test-find-by-slug');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find By Slug Test');
    });
  });

  describe('findByUserId', () => {
    it('should return only projects user is member of', async () => {
      await projectService.create({
        name: 'My Project',
        slug: 'test-my-project',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const projects = await projectService.findByUserId(testUserId);
      expect(projects.length).toBeGreaterThanOrEqual(1);
      expect(projects.some((p) => p.slug === 'test-my-project')).toBe(true);
    });
  });

  describe('update', () => {
    it('should update project name', async () => {
      const project = await projectService.create({
        name: 'Original Name',
        slug: 'test-update',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const updated = await projectService.update(project.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should update languages', async () => {
      const project = await projectService.create({
        name: 'Lang Update Test',
        slug: 'test-lang-update',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const updated = await projectService.update(project.id, {
        languageCodes: ['en', 'fr', 'de'],
        defaultLanguage: 'en',
      });

      expect(updated.languages).toHaveLength(3);
    });

    it('should throw NotFoundError for non-existent project', async () => {
      await expect(
        projectService.update('non-existent-id', { name: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete project', async () => {
      const project = await projectService.create({
        name: 'Delete Test',
        slug: 'test-delete',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      await projectService.delete(project.id);

      const found = await projectService.findById(project.id);
      expect(found).toBeNull();
    });

    it('should throw NotFoundError for non-existent project', async () => {
      await expect(projectService.delete('non-existent-id')).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return project statistics', async () => {
      const project = await projectService.create({
        name: 'Stats Project',
        slug: 'test-stats-project',
        languageCodes: ['en', 'es'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const stats = await projectService.getStats(project.id);
      // Project auto-creates a default space on creation
      expect(stats.spaces).toBe(1);
      expect(stats.totalKeys).toBe(0);
      expect(stats.translationsByLanguage).toBeDefined();
    });
  });

  describe('checkMembership', () => {
    it('should return true for project member', async () => {
      const project = await projectService.create({
        name: 'Membership Test',
        slug: 'test-membership',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const isMember = await projectService.checkMembership(
        project.id,
        testUserId
      );
      expect(isMember).toBe(true);
    });

    it('should return false for non-member', async () => {
      const project = await projectService.create({
        name: 'Non-Membership Test',
        slug: 'test-non-membership',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: `project-unit-other-${Date.now()}@example.com`,
          password: 'hashed',
          name: 'Other User',
        },
      });

      const isMember = await projectService.checkMembership(
        project.id,
        otherUser.id
      );
      expect(isMember).toBe(false);
    });
  });

  describe('getMemberRole', () => {
    it('should return OWNER for project creator', async () => {
      const project = await projectService.create({
        name: 'Role Test',
        slug: 'test-role',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const role = await projectService.getMemberRole(project.id, testUserId);
      expect(role).toBe('OWNER');
    });

    it('should return null for non-member', async () => {
      const project = await projectService.create({
        name: 'Role Test 2',
        slug: 'test-role-2',
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const role = await projectService.getMemberRole(
        project.id,
        'non-existent-user-id'
      );
      expect(role).toBeNull();
    });
  });
});
