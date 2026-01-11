/**
 * CreateSpaceHandler Unit Tests
 *
 * Tests for space creation command handler.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import type { Space } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { CreateSpaceCommand } from '../commands/create-space.command.js';
import { CreateSpaceHandler } from '../commands/create-space.handler.js';
import { SpaceCreatedEvent } from '../events/space-created.event.js';
import type { SpaceRepository } from '../space.repository.js';

interface MockSpaceRepository {
  findById: Mock;
  findByProjectId: Mock;
  existsBySlugInProject: Mock;
  getProjectIdBySpaceId: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  exists: Mock;
}

interface MockProjectRepository {
  findById: Mock;
  findBySlug: Mock;
  findByIdOrSlug: Mock;
  existsBySlug: Mock;
  getMemberRole: Mock;
  checkMembership: Mock;
  findByUserIdWithStats: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  getTree: Mock;
}

interface MockEventBus {
  publish: Mock;
  publishAll: Mock;
}

function createMockSpaceRepository(): MockSpaceRepository {
  return {
    findById: vi.fn(),
    findByProjectId: vi.fn(),
    existsBySlugInProject: vi.fn(),
    getProjectIdBySpaceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    exists: vi.fn(),
  };
}

function createMockProjectRepository(): MockProjectRepository {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByIdOrSlug: vi.fn(),
    existsBySlug: vi.fn(),
    getMemberRole: vi.fn(),
    checkMembership: vi.fn(),
    findByUserIdWithStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    getTree: vi.fn(),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };
}

describe('CreateSpaceHandler', () => {
  let handler: CreateSpaceHandler;
  let mockSpaceRepository: MockSpaceRepository;
  let mockProjectRepository: MockProjectRepository;
  let mockEventBus: MockEventBus;

  const mockProject = {
    id: 'proj-1',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    defaultLanguage: 'en',
    activityRetentionDays: 90,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    languages: [{ id: 'lang-1', code: 'en', name: 'English', isDefault: true }],
  };

  const mockCreatedSpace: Space = {
    id: 'space-1',
    name: 'Test Space',
    slug: 'test-space',
    description: 'A test space',
    projectId: 'proj-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockSpaceRepository = createMockSpaceRepository();
    mockProjectRepository = createMockProjectRepository();
    mockEventBus = createMockEventBus();
    handler = new CreateSpaceHandler(
      mockSpaceRepository as unknown as SpaceRepository,
      mockProjectRepository as unknown as import('../../project/project.repository.js').ProjectRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    // Happy path
    it('should create space with valid input', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.existsBySlugInProject.mockResolvedValue(false);
      mockSpaceRepository.create.mockResolvedValue(mockCreatedSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new CreateSpaceCommand(
        'proj-1',
        'Test Space',
        'test-space',
        'A test space',
        'user-1'
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(mockCreatedSpace);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith('proj-1');
      expect(mockProjectRepository.checkMembership).toHaveBeenCalledWith('proj-1', 'user-1');
      expect(mockSpaceRepository.existsBySlugInProject).toHaveBeenCalledWith(
        'proj-1',
        'test-space'
      );
      expect(mockSpaceRepository.create).toHaveBeenCalledWith({
        name: 'Test Space',
        slug: 'test-space',
        description: 'A test space',
        projectId: 'proj-1',
      });
    });

    // Project not found
    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(null);

      const command = new CreateSpaceCommand(
        'nonexistent-project',
        'Test Space',
        'test-space',
        'A test space',
        'user-1'
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockSpaceRepository.create).not.toHaveBeenCalled();
    });

    // User not a member
    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(false);

      const command = new CreateSpaceCommand(
        'proj-1',
        'Test Space',
        'test-space',
        'A test space',
        'non-member-user'
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Not a member of this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockSpaceRepository.create).not.toHaveBeenCalled();
    });

    // Duplicate slug
    it('should throw FieldValidationError when slug already exists in project', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.existsBySlugInProject.mockResolvedValue(true);

      const command = new CreateSpaceCommand(
        'proj-1',
        'Test Space',
        'existing-slug',
        'A test space',
        'user-1'
      );

      // Act & Assert
      try {
        await handler.execute(command);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const appError = error as {
          code: string;
          fieldErrors: Array<{ field: string; code: string }>;
        };
        expect(appError.code).toBe('FIELD_VALIDATION_ERROR');
        expect(appError.fieldErrors).toHaveLength(1);
        expect(appError.fieldErrors[0].field).toBe('slug');
        expect(appError.fieldErrors[0].code).toBe(UNIQUE_VIOLATION_CODES.SPACE_SLUG);
      }

      expect(mockSpaceRepository.create).not.toHaveBeenCalled();
    });

    // Event emission
    it('should emit SpaceCreatedEvent after creation', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.existsBySlugInProject.mockResolvedValue(false);
      mockSpaceRepository.create.mockResolvedValue(mockCreatedSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new CreateSpaceCommand(
        'proj-1',
        'Test Space',
        'test-space',
        'A test space',
        'user-1'
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(SpaceCreatedEvent);
      expect(publishedEvent.space).toEqual(mockCreatedSpace);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.occurredAt).toBeInstanceOf(Date);
    });

    // Create without description
    it('should create space without description', async () => {
      // Arrange
      const spaceWithoutDesc = { ...mockCreatedSpace, description: null };
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.existsBySlugInProject.mockResolvedValue(false);
      mockSpaceRepository.create.mockResolvedValue(spaceWithoutDesc);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new CreateSpaceCommand(
        'proj-1',
        'Test Space',
        'test-space',
        undefined,
        'user-1'
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.description).toBeNull();
      expect(mockSpaceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined })
      );
    });

    // Race condition handling (P2002 unique constraint)
    it('should handle race condition when slug is taken between check and create', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.existsBySlugInProject.mockResolvedValue(false);

      // Import Prisma to create a proper error instance
      const { Prisma } = await import('@prisma/client');
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`slug`)',
        { code: 'P2002', clientVersion: '5.0.0' }
      );

      mockSpaceRepository.create.mockRejectedValue(prismaError);

      const command = new CreateSpaceCommand(
        'proj-1',
        'Test Space',
        'race-condition-slug',
        'A test space',
        'user-1'
      );

      // Act & Assert
      try {
        await handler.execute(command);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const appError = error as {
          code: string;
          fieldErrors?: Array<{ field: string; code: string; message: string }>;
        };
        // Strong assertions for the race condition error
        expect(appError.code).toBe('FIELD_VALIDATION_ERROR');
        expect(appError.fieldErrors).toHaveLength(1);
        expect(appError.fieldErrors![0].field).toBe('slug');
        expect(appError.fieldErrors![0].code).toBe(UNIQUE_VIOLATION_CODES.SPACE_SLUG);
        expect(appError.fieldErrors![0].message).toContain('slug already exists');
      }
    });

    // Repository error propagation
    it('should propagate repository errors', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.existsBySlugInProject.mockResolvedValue(false);
      mockSpaceRepository.create.mockRejectedValue(new Error('Database connection lost'));

      const command = new CreateSpaceCommand(
        'proj-1',
        'Test Space',
        'test-space',
        'A test space',
        'user-1'
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database connection lost');
    });

    // EventBus error propagation
    it('should propagate event bus errors', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.existsBySlugInProject.mockResolvedValue(false);
      mockSpaceRepository.create.mockResolvedValue(mockCreatedSpace);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus unavailable'));

      const command = new CreateSpaceCommand(
        'proj-1',
        'Test Space',
        'test-space',
        'A test space',
        'user-1'
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Event bus unavailable');
    });
  });
});
