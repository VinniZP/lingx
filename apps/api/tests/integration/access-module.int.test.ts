/**
 * Access Module Integration Tests
 *
 * Tests the access module's authorization flow with real database.
 * Verifies AccessRepository and AccessService work together correctly.
 */
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { AccessRepository } from '../../src/modules/access/access.repository.js';
import { AccessService } from '../../src/modules/access/access.service.js';
import type { Cradle } from '../../src/shared/container/index.js';

describe('Access Module Integration', () => {
  let app: FastifyInstance;
  let container: AwilixContainer<Cradle>;
  let accessService: AccessService;
  let accessRepository: AccessRepository;

  // Test data
  let testUserId: string;
  let testProjectId: string;
  let testBranchId: string;
  let testKeyId: string;
  let testTranslationId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    container = app.container;
    accessService = container.resolve('accessService');
    accessRepository = container.resolve('accessRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await app.prisma.auditLog.deleteMany({});
    await app.prisma.translation.deleteMany({});
    await app.prisma.translationKey.deleteMany({});
    await app.prisma.branch.deleteMany({});
    await app.prisma.space.deleteMany({});
    await app.prisma.projectMember.deleteMany({});
    await app.prisma.projectLanguage.deleteMany({});
    await app.prisma.project.deleteMany({});
    await app.prisma.user.deleteMany({
      where: { email: { contains: 'access-test' } },
    });

    // Create test user
    const user = await app.prisma.user.create({
      data: {
        email: 'access-test@example.com',
        password: 'hashed-password',
        name: 'Access Test User',
      },
    });
    testUserId = user.id;

    // Create test project with user as member
    const project = await app.prisma.project.create({
      data: {
        name: 'Access Test Project',
        slug: 'access-test-project',
        defaultLanguage: 'en',
        languages: {
          create: [
            { code: 'en', name: 'English', isDefault: true },
            { code: 'de', name: 'German', isDefault: false },
          ],
        },
        members: {
          create: {
            userId: testUserId,
            role: 'OWNER',
          },
        },
        spaces: {
          create: {
            name: 'Default',
            slug: 'default',
            branches: {
              create: {
                name: 'main',
                slug: 'main',
                isDefault: true,
              },
            },
          },
        },
      },
      include: {
        spaces: {
          include: {
            branches: true,
          },
        },
      },
    });
    testProjectId = project.id;
    testBranchId = project.spaces[0].branches[0].id;

    // Create test key
    const key = await app.prisma.translationKey.create({
      data: {
        name: 'greeting.hello',
        namespace: 'common',
        branchId: testBranchId,
      },
    });
    testKeyId = key.id;

    // Create test translation
    const translation = await app.prisma.translation.create({
      data: {
        keyId: testKeyId,
        language: 'en',
        value: 'Hello',
        status: 'PENDING',
      },
    });
    testTranslationId = translation.id;
  });

  describe('Module Registration', () => {
    it('should register AccessRepository in container', () => {
      expect(accessRepository).toBeInstanceOf(AccessRepository);
    });

    it('should register AccessService in container', () => {
      expect(accessService).toBeInstanceOf(AccessService);
    });
  });

  describe('AccessRepository', () => {
    it('should find translation with membership when user is a member', async () => {
      const result = await accessRepository.findTranslationWithMembership(
        testTranslationId,
        testUserId
      );

      expect(result).not.toBeNull();
      expect(result?.key.branch.space.project.members).toHaveLength(1);
      expect(result?.key.branch.space.project.members[0].userId).toBe(testUserId);
    });

    it('should return translation with empty members array when user is not a member', async () => {
      const result = await accessRepository.findTranslationWithMembership(
        testTranslationId,
        'nonexistent-user'
      );

      expect(result).not.toBeNull();
      expect(result?.key.branch.space.project.members).toHaveLength(0);
    });

    it('should return null when translation does not exist', async () => {
      const result = await accessRepository.findTranslationWithMembership(
        'nonexistent-translation',
        testUserId
      );

      expect(result).toBeNull();
    });

    it('should find branch with membership and return project info', async () => {
      const result = await accessRepository.findBranchWithMembership(testBranchId, testUserId);

      expect(result).not.toBeNull();
      expect(result?.space.project.id).toBe(testProjectId);
      expect(result?.space.project.defaultLanguage).toBe('en');
      expect(result?.space.project.languages).toHaveLength(2);
      expect(result?.space.project.members).toHaveLength(1);
    });

    it('should find project membership with role', async () => {
      const result = await accessRepository.findProjectMembership(testProjectId, testUserId);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('OWNER');
    });

    it('should return null when user is not a project member', async () => {
      const result = await accessRepository.findProjectMembership(
        testProjectId,
        'nonexistent-user'
      );

      expect(result).toBeNull();
    });
  });

  describe('AccessService', () => {
    it('should verify translation access for project member', async () => {
      await expect(
        accessService.verifyTranslationAccess(testUserId, testTranslationId)
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundError for nonexistent translation', async () => {
      await expect(
        accessService.verifyTranslationAccess(testUserId, 'nonexistent-translation')
      ).rejects.toThrow('Translation');
    });

    it('should throw ForbiddenError for non-member', async () => {
      await expect(
        accessService.verifyTranslationAccess('nonexistent-user', testTranslationId)
      ).rejects.toThrow('Not authorized');
    });

    it('should verify key access for project member', async () => {
      await expect(accessService.verifyKeyAccess(testUserId, testKeyId)).resolves.toBeUndefined();
    });

    it('should verify key in branch and return key info', async () => {
      const result = await accessService.verifyKeyInBranch(testUserId, testKeyId, testBranchId);

      expect(result).toEqual({
        id: testKeyId,
        name: 'greeting.hello',
        namespace: 'common',
      });
    });

    it('should throw NotFoundError when key does not belong to branch', async () => {
      // Create another branch
      const otherSpace = await app.prisma.space.create({
        data: {
          name: 'Other',
          slug: 'other',
          projectId: testProjectId,
        },
      });
      const otherBranch = await app.prisma.branch.create({
        data: {
          name: 'feature',
          slug: 'feature',
          spaceId: otherSpace.id,
        },
      });

      await expect(
        accessService.verifyKeyInBranch(testUserId, testKeyId, otherBranch.id)
      ).rejects.toThrow('Key');
    });

    it('should verify branch access and return project info', async () => {
      const result = await accessService.verifyBranchAccess(testUserId, testBranchId);

      expect(result).toEqual({
        projectId: testProjectId,
        defaultLanguage: 'en',
        languages: ['en', 'de'],
      });
    });

    it('should verify project access and return role', async () => {
      const result = await accessService.verifyProjectAccess(testUserId, testProjectId);

      expect(result).toEqual({ role: 'OWNER' });
    });

    it('should verify project access with required roles', async () => {
      const result = await accessService.verifyProjectAccess(testUserId, testProjectId, [
        'OWNER',
        'MANAGER',
      ]);

      expect(result).toEqual({ role: 'OWNER' });
    });

    it('should throw ForbiddenError when user lacks required role', async () => {
      // Update user to DEVELOPER role
      await app.prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId: testProjectId,
            userId: testUserId,
          },
        },
        data: {
          role: 'DEVELOPER',
        },
      });

      await expect(
        accessService.verifyProjectAccess(testUserId, testProjectId, ['OWNER', 'MANAGER'])
      ).rejects.toThrow('Insufficient permissions');
    });
  });
});
