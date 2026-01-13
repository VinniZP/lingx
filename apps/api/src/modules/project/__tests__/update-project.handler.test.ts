/**
 * UpdateProjectHandler Unit Tests
 *
 * Tests for project update command handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { UpdateProjectCommand } from '../commands/update-project.command.js';
import { UpdateProjectHandler } from '../commands/update-project.handler.js';
import { ProjectUpdatedEvent } from '../events/project-updated.event.js';
import type { ProjectRepository, ProjectWithLanguages } from '../project.repository.js';

interface MockRepository {
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

function createMockRepository(): MockRepository {
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

interface MockAccessService {
  verifyProjectAccess: Mock;
  verifyBranchAccess: Mock;
  verifyTranslationAccess: Mock;
  verifyKeyAccess: Mock;
}

function createMockAccessService(): MockAccessService {
  return {
    verifyProjectAccess: vi.fn().mockResolvedValue({ role: 'OWNER' }),
    verifyBranchAccess: vi.fn(),
    verifyTranslationAccess: vi.fn(),
    verifyKeyAccess: vi.fn(),
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

describe('UpdateProjectHandler', () => {
  let handler: UpdateProjectHandler;
  let mockRepository: MockRepository;
  let mockAccessService: MockAccessService;
  let mockEventBus: MockEventBus;

  const mockProject: ProjectWithLanguages = {
    id: 'proj-1',
    name: 'Original Name',
    slug: 'original-slug',
    description: 'Original description',
    defaultLanguage: 'en',
    activityRetentionDays: 90,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    languages: [
      { id: 'lang-1', code: 'en', name: 'English', isDefault: true },
      { id: 'lang-2', code: 'es', name: 'Spanish', isDefault: false },
    ],
  };

  const mockUpdatedProject: ProjectWithLanguages = {
    ...mockProject,
    name: 'Updated Name',
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockAccessService = createMockAccessService();
    mockEventBus = createMockEventBus();
    handler = new UpdateProjectHandler(
      mockRepository as unknown as ProjectRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    // Happy path - update name
    it('should update project name when authorized', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.update.mockResolvedValue(mockUpdatedProject);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateProjectCommand('proj-1', 'user-1', { name: 'Updated Name' });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(mockUpdatedProject);
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('proj-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1', [
        'MANAGER',
        'OWNER',
      ]);
      expect(mockRepository.update).toHaveBeenCalledWith('proj-1', { name: 'Updated Name' });
    });

    // Not found error
    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(null);

      const command = new UpdateProjectCommand('non-existent', 'user-1', { name: 'New Name' });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    // Authorization failure
    it('should throw ForbiddenError when user lacks required role', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockRejectedValue({
        message: 'Insufficient permissions for this operation',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      const command = new UpdateProjectCommand('proj-1', 'developer-user', { name: 'New Name' });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Insufficient permissions for this operation',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    // Validation error - default language
    it('should throw ValidationError when default language not in language codes', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);

      const command = new UpdateProjectCommand('proj-1', 'user-1', {
        languageCodes: ['en', 'es'],
        defaultLanguage: 'fr', // Not in language codes
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Default language must be included in language codes',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    // Event emission
    it('should emit ProjectUpdatedEvent with changed fields', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.update.mockResolvedValue(mockUpdatedProject);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateProjectCommand('proj-1', 'user-1', { name: 'Updated Name' });

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ProjectUpdatedEvent);
      expect(publishedEvent.project).toEqual(mockUpdatedProject);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.changedFields).toContain('name');
      expect(publishedEvent.previousValues.name).toBe('Original Name');
    });

    // No event when no changes
    it('should not emit event when no fields actually changed', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.update.mockResolvedValue(mockProject);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateProjectCommand('proj-1', 'user-1', { name: 'Original Name' });

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    // Multiple field update
    it('should update multiple fields and track all changes', async () => {
      // Arrange
      const multipleUpdatedProject = {
        ...mockProject,
        name: 'New Name',
        description: 'New description',
      };
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.update.mockResolvedValue(multipleUpdatedProject);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateProjectCommand('proj-1', 'user-1', {
        name: 'New Name',
        description: 'New description',
      });

      // Act
      await handler.execute(command);

      // Assert
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.changedFields).toContain('name');
      expect(publishedEvent.changedFields).toContain('description');
      expect(publishedEvent.previousValues.name).toBe('Original Name');
      expect(publishedEvent.previousValues.description).toBe('Original description');
    });

    // Update with slug as identifier
    it('should work with slug as identifier', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.update.mockResolvedValue(mockUpdatedProject);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateProjectCommand('original-slug', 'user-1', { name: 'Updated Name' });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(mockUpdatedProject);
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('original-slug');
    });
  });
});
