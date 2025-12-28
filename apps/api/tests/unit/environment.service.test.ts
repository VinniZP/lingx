/**
 * Environment Service Unit Tests
 *
 * Tests for environment CRUD operations with branch pointer management.
 * Per Design Doc: AC-WEB-017, AC-WEB-018, AC-WEB-019
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { EnvironmentService } from '../../src/services/environment.service.js';
import { ProjectService } from '../../src/services/project.service.js';
import { SpaceService } from '../../src/services/space.service.js';

describe('EnvironmentService', () => {
  let environmentService: EnvironmentService;
  let projectService: ProjectService;
  let spaceService: SpaceService;
  let testUserId: string;
  let testProjectId: string;
  let testSpaceId: string;
  let mainBranchId: string;

  beforeAll(async () => {
    environmentService = new EnvironmentService(prisma);
    projectService = new ProjectService(prisma);
    spaceService = new SpaceService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data - order matters due to foreign keys
    // Use 'env-unit-' prefix unique to this test file to avoid conflicts
    await prisma.environment.deleteMany({
      where: { slug: { startsWith: 'env-unit-' } },
    });
    await prisma.translation.deleteMany({
      where: {
        key: {
          branch: {
            space: {
              slug: { startsWith: 'env-unit-' },
            },
          },
        },
      },
    });
    await prisma.translationKey.deleteMany({
      where: {
        branch: {
          space: {
            slug: { startsWith: 'env-unit-' },
          },
        },
      },
    });
    await prisma.branch.deleteMany({
      where: {
        space: {
          slug: { startsWith: 'env-unit-' },
        },
      },
    });
    await prisma.space.deleteMany({
      where: { slug: { startsWith: 'env-unit-' } },
    });
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { slug: { startsWith: 'env-unit-proj-' } } },
          { user: { email: { startsWith: 'env-unit-' } } },
        ],
      },
    });
    await prisma.project.deleteMany({
      where: { slug: { startsWith: 'env-unit-proj-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'env-unit-' } },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `env-unit-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test project
    const project = await projectService.create({
      name: 'Environment Test Project',
      slug: `env-unit-proj-${Date.now()}`,
      languageCodes: ['en', 'es'],
      defaultLanguage: 'en',
      userId: testUserId,
    });
    testProjectId = project.id;

    // Create test space (auto-creates main branch)
    const space = await spaceService.create({
      name: 'Test Space',
      slug: `env-unit-${Date.now()}`,
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
    it('should create environment associated with project and branch', async () => {
      const env = await environmentService.create({
        name: 'Production',
        slug: `env-unit-production-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      expect(env.name).toBe('Production');
      expect(env.slug).toContain('env-unit-production');
      expect(env.projectId).toBe(testProjectId);
      expect(env.branchId).toBe(mainBranchId);
      expect(env.branch).toBeDefined();
      expect(env.branch.id).toBe(mainBranchId);
    });

    it('should reject duplicate slug within project', async () => {
      const uniqueSlug = `env-unit-dup-${Date.now()}`;

      await environmentService.create({
        name: 'First Env',
        slug: uniqueSlug,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      await expect(
        environmentService.create({
          name: 'Second Env',
          slug: uniqueSlug,
          projectId: testProjectId,
          branchId: mainBranchId,
        })
      ).rejects.toThrow('Environment with this slug already exists');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      await expect(
        environmentService.create({
          name: 'Test',
          slug: `env-unit-test-${Date.now()}`,
          projectId: 'non-existent-id',
          branchId: mainBranchId,
        })
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError for non-existent branch', async () => {
      await expect(
        environmentService.create({
          name: 'Test',
          slug: `env-unit-test-${Date.now()}`,
          projectId: testProjectId,
          branchId: 'non-existent-id',
        })
      ).rejects.toThrow('Branch not found');
    });

    it('should reject branch from different project', async () => {
      // Create another project with space and branch
      const otherProject = await projectService.create({
        name: 'Other Project',
        slug: `env-unit-proj-other-${Date.now()}`,
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const otherSpace = await spaceService.create({
        name: 'Other Space',
        slug: `env-unit-other-${Date.now()}`,
        projectId: otherProject.id,
      });

      const otherBranches = await prisma.branch.findMany({
        where: { spaceId: otherSpace.id },
      });

      await expect(
        environmentService.create({
          name: 'Test',
          slug: `env-unit-test-${Date.now()}`,
          projectId: testProjectId,
          branchId: otherBranches[0].id,
        })
      ).rejects.toThrow('Branch must belong to a space in this project');
    });
  });

  describe('findById', () => {
    it('should return environment with branch details', async () => {
      const env = await environmentService.create({
        name: 'Staging',
        slug: `env-unit-staging-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      const found = await environmentService.findById(env.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Staging');
      expect(found?.branch.id).toBe(mainBranchId);
      expect(found?.branch.space).toBeDefined();
    });

    it('should return null for non-existent environment', async () => {
      const found = await environmentService.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should return all environments for a project', async () => {
      await environmentService.create({
        name: 'Development',
        slug: `env-unit-dev-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });
      await environmentService.create({
        name: 'Staging',
        slug: `env-unit-staging-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      const envs = await environmentService.findByProjectId(testProjectId);

      // Filter to only our test environments
      const testEnvs = envs.filter(e => e.slug.startsWith('env-unit-'));
      expect(testEnvs.length).toBeGreaterThanOrEqual(2);
    });

    it('should return environments ordered by name', async () => {
      await environmentService.create({
        name: 'Zebra',
        slug: `env-unit-zebra-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });
      await environmentService.create({
        name: 'Alpha',
        slug: `env-unit-alpha-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      const envs = await environmentService.findByProjectId(testProjectId);
      const testEnvs = envs.filter(e => e.slug.startsWith('env-unit-'));

      expect(testEnvs[0].name).toBe('Alpha');
      expect(testEnvs[1].name).toBe('Zebra');
    });

    it('should return empty array for project with no environments', async () => {
      // Create a new project without environments
      const newProject = await projectService.create({
        name: 'Empty Project',
        slug: `env-unit-proj-empty-${Date.now()}`,
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const envs = await environmentService.findByProjectId(newProject.id);
      expect(envs).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update environment name', async () => {
      const env = await environmentService.create({
        name: 'Original',
        slug: `env-unit-original-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      const updated = await environmentService.update(env.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.slug).toBe(env.slug); // slug should not change
    });

    it('should throw NotFoundError for non-existent environment', async () => {
      await expect(
        environmentService.update('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Environment not found');
    });
  });

  describe('switchBranch', () => {
    it('should update environment branch pointer', async () => {
      const env = await environmentService.create({
        name: 'Staging',
        slug: `env-unit-switch-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      // Create a feature branch
      const featureBranch = await prisma.branch.create({
        data: {
          name: 'feature-test',
          slug: 'feature-test',
          spaceId: testSpaceId,
          sourceBranchId: mainBranchId,
        },
      });

      // Switch environment to feature branch
      const updated = await environmentService.switchBranch(
        env.id,
        featureBranch.id
      );

      expect(updated.branchId).toBe(featureBranch.id);
      expect(updated.branch.id).toBe(featureBranch.id);
    });

    it('should throw NotFoundError for non-existent environment', async () => {
      await expect(
        environmentService.switchBranch('non-existent-id', mainBranchId)
      ).rejects.toThrow('Environment not found');
    });

    it('should throw NotFoundError for non-existent branch', async () => {
      const env = await environmentService.create({
        name: 'Test',
        slug: `env-unit-test-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      await expect(
        environmentService.switchBranch(env.id, 'non-existent-id')
      ).rejects.toThrow('Branch not found');
    });

    it('should reject switching to branch from different project', async () => {
      const env = await environmentService.create({
        name: 'Test',
        slug: `env-unit-crossproj-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      // Create another project with space and branch
      const otherProject = await projectService.create({
        name: 'Other Project',
        slug: `env-unit-proj-switch-${Date.now()}`,
        languageCodes: ['en'],
        defaultLanguage: 'en',
        userId: testUserId,
      });

      const otherSpace = await spaceService.create({
        name: 'Other Space',
        slug: `env-unit-switch-other-${Date.now()}`,
        projectId: otherProject.id,
      });

      const otherBranches = await prisma.branch.findMany({
        where: { spaceId: otherSpace.id },
      });

      await expect(
        environmentService.switchBranch(env.id, otherBranches[0].id)
      ).rejects.toThrow('Branch must belong to this project');
    });
  });

  describe('delete', () => {
    it('should delete environment', async () => {
      const env = await environmentService.create({
        name: 'To Delete',
        slug: `env-unit-delete-${Date.now()}`,
        projectId: testProjectId,
        branchId: mainBranchId,
      });

      await environmentService.delete(env.id);

      const found = await environmentService.findById(env.id);
      expect(found).toBeNull();
    });

    it('should throw NotFoundError for non-existent environment', async () => {
      await expect(
        environmentService.delete('non-existent-id')
      ).rejects.toThrow('Environment not found');
    });
  });
});
