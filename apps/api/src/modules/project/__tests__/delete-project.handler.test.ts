/**
 * DeleteProjectHandler Unit Tests
 *
 * Tests for project deletion command handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { DeleteProjectCommand } from '../commands/delete-project.command.js';
import { DeleteProjectHandler } from '../commands/delete-project.handler.js';
import { ProjectDeletedEvent } from '../events/project-deleted.event.js';
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

describe('DeleteProjectHandler', () => {
  let handler: DeleteProjectHandler;
  let mockRepository: MockRepository;
  let mockAccessService: MockAccessService;
  let mockEventBus: MockEventBus;

  const mockProject: ProjectWithLanguages = {
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

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockAccessService = createMockAccessService();
    mockEventBus = createMockEventBus();
    handler = new DeleteProjectHandler(
      mockRepository as unknown as ProjectRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    // Happy path
    it('should delete project when user is owner', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteProjectCommand('proj-1', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('proj-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1', [
        'OWNER',
      ]);
      expect(mockRepository.delete).toHaveBeenCalledWith('proj-1');
    });

    // Not found error
    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(null);

      const command = new DeleteProjectCommand('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    // Authorization failure - not owner
    it('should throw ForbiddenError when user is not owner', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockRejectedValue({
        message: 'Only project owner can delete',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      const command = new DeleteProjectCommand('proj-1', 'manager-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Only project owner can delete',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    // Event emission
    it('should emit ProjectDeletedEvent after deletion', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteProjectCommand('proj-1', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ProjectDeletedEvent);
      expect(publishedEvent.projectId).toBe('proj-1');
      expect(publishedEvent.projectName).toBe('Test Project');
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.occurredAt).toBeInstanceOf(Date);
    });

    // Work with slug as identifier
    it('should work with slug as identifier', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteProjectCommand('test-project', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('test-project');
      expect(mockRepository.delete).toHaveBeenCalledWith('proj-1');
    });
  });
});
