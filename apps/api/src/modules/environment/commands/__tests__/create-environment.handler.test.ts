/**
 * CreateEnvironmentHandler Unit Tests
 *
 * Tests for environment creation command handler with validation.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { EnvironmentCreatedEvent } from '../../events/environment-created.event.js';
import { CreateEnvironmentCommand } from '../create-environment.command.js';
import { CreateEnvironmentHandler } from '../create-environment.handler.js';
// Error classes not imported - using toMatchObject for assertions
import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import type { IEventBus } from '../../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../../environment.repository.js';

interface MockRepository {
  findById: Mock;
  findByProjectId: Mock;
  findByProjectAndSlug: Mock;
  findBranchById: Mock;
  projectExists: Mock;
  create: Mock;
  update: Mock;
  switchBranch: Mock;
  delete: Mock;
}

function createMockRepository(): MockRepository {
  return {
    findById: vi.fn(),
    findByProjectId: vi.fn(),
    findByProjectAndSlug: vi.fn(),
    findBranchById: vi.fn(),
    projectExists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    switchBranch: vi.fn(),
    delete: vi.fn(),
  };
}

interface MockEventBus {
  publish: Mock;
  publishAll: Mock;
}

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };
}

describe('CreateEnvironmentHandler', () => {
  let handler: CreateEnvironmentHandler;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  const mockEnvironmentWithBranch = {
    id: 'env-1',
    name: 'Production',
    slug: 'production',
    projectId: 'proj-1',
    branchId: 'branch-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    branch: {
      id: 'branch-1',
      name: 'main',
      slug: 'main',
      spaceId: 'space-1',
      space: {
        id: 'space-1',
        name: 'Default Space',
        slug: 'default',
      },
    },
  };

  const mockBranchWithSpace = {
    id: 'branch-1',
    name: 'main',
    slug: 'main',
    space: {
      id: 'space-1',
      name: 'Default Space',
      slug: 'default',
      projectId: 'proj-1',
    },
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new CreateEnvironmentHandler(
      mockRepository as unknown as EnvironmentRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    it('should create environment when all validations pass', async () => {
      // Arrange
      mockRepository.projectExists.mockResolvedValue(true);
      mockRepository.findBranchById.mockResolvedValue(mockBranchWithSpace);
      mockRepository.findByProjectAndSlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEnvironmentWithBranch);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new CreateEnvironmentCommand(
        'Production',
        'production',
        'proj-1',
        'branch-1',
        'user-1'
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(mockEnvironmentWithBranch);
      expect(mockRepository.projectExists).toHaveBeenCalledWith('proj-1');
      expect(mockRepository.findBranchById).toHaveBeenCalledWith('branch-1');
      expect(mockRepository.findByProjectAndSlug).toHaveBeenCalledWith('proj-1', 'production');
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'Production',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-1',
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(EnvironmentCreatedEvent));
    });

    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockRepository.projectExists.mockResolvedValue(false);

      const command = new CreateEnvironmentCommand(
        'Production',
        'production',
        'non-existent-proj',
        'branch-1',
        'user-1'
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
      expect(mockRepository.findBranchById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when branch does not exist', async () => {
      // Arrange
      mockRepository.projectExists.mockResolvedValue(true);
      mockRepository.findBranchById.mockResolvedValue(null);

      const command = new CreateEnvironmentCommand(
        'Production',
        'production',
        'proj-1',
        'non-existent-branch',
        'user-1'
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Branch not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
      expect(mockRepository.findByProjectAndSlug).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when branch belongs to different project', async () => {
      // Arrange
      mockRepository.projectExists.mockResolvedValue(true);
      mockRepository.findBranchById.mockResolvedValue({
        id: 'branch-1',
        name: 'main',
        slug: 'main',
        space: {
          id: 'space-2',
          name: 'Other Space',
          slug: 'other',
          projectId: 'other-proj', // Different project
        },
      });

      const command = new CreateEnvironmentCommand(
        'Production',
        'production',
        'proj-1',
        'branch-1',
        'user-1'
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Branch must belong to a space in this project',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
      expect(mockRepository.findByProjectAndSlug).not.toHaveBeenCalled();
    });

    it('should throw FieldValidationError when slug already exists in project', async () => {
      // Arrange
      mockRepository.projectExists.mockResolvedValue(true);
      mockRepository.findBranchById.mockResolvedValue(mockBranchWithSpace);
      mockRepository.findByProjectAndSlug.mockResolvedValue({
        id: 'existing-env',
        name: 'Existing Env',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const command = new CreateEnvironmentCommand(
        'Production',
        'production',
        'proj-1',
        'branch-1',
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
        expect(appError.fieldErrors[0].code).toBe(UNIQUE_VIOLATION_CODES.ENVIRONMENT_SLUG);
      }

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should publish EnvironmentCreatedEvent with correct data', async () => {
      // Arrange
      mockRepository.projectExists.mockResolvedValue(true);
      mockRepository.findBranchById.mockResolvedValue(mockBranchWithSpace);
      mockRepository.findByProjectAndSlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockEnvironmentWithBranch);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new CreateEnvironmentCommand(
        'Production',
        'production',
        'proj-1',
        'branch-1',
        'user-1'
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(EnvironmentCreatedEvent);
      expect(publishedEvent.environment).toEqual(mockEnvironmentWithBranch);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.occurredAt).toBeInstanceOf(Date);
    });
  });
});
