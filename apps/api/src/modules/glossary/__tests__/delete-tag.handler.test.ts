import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteTagCommand } from '../commands/delete-tag.command.js';
import { DeleteTagHandler } from '../commands/delete-tag.handler.js';
import { GlossaryTagDeletedEvent } from '../events/glossary-tag-deleted.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';

describe('DeleteTagHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    tagBelongsToProject: vi.fn(),
    deleteTag: vi.fn(),
  };

  const mockEventBus = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new DeleteTagHandler(
      mockRepository as unknown as GlossaryRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete tag when user has MANAGER role and tag exists', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.tagBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteTag.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteTagCommand('project-1', 'user-1', 'tag-1');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.tagBelongsToProject).toHaveBeenCalledWith('tag-1', 'project-1');
    expect(mockRepository.deleteTag).toHaveBeenCalledWith('tag-1');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(GlossaryTagDeletedEvent));
  });

  it('should delete tag when user has OWNER role', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.tagBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteTag.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteTagCommand('project-1', 'user-1', 'tag-1');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
  });

  it('should throw ForbiddenError when user has MEMBER role', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Not authorized to perform this action')
    );

    const handler = createHandler();
    const command = new DeleteTagCommand('project-1', 'user-1', 'tag-1');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockRepository.deleteTag).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when tag does not belong to project', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.tagBelongsToProject.mockResolvedValue(false);

    const handler = createHandler();
    const command = new DeleteTagCommand('project-1', 'user-1', 'tag-1');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepository.deleteTag).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should emit GlossaryTagDeletedEvent after successful deletion', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.tagBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteTag.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteTagCommand('project-1', 'user-1', 'tag-1');

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const event = mockEventBus.publish.mock.calls[0][0] as GlossaryTagDeletedEvent;
    expect(event.projectId).toBe('project-1');
    expect(event.tagId).toBe('tag-1');
    expect(event.userId).toBe('user-1');
    expect(event.occurredAt).toBeInstanceOf(Date);
  });
});
