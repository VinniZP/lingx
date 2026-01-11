import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteEntryCommand } from '../commands/delete-entry.command.js';
import { DeleteEntryHandler } from '../commands/delete-entry.handler.js';
import { GlossaryEntryDeletedEvent } from '../events/glossary-entry-deleted.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';

describe('DeleteEntryHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    entryBelongsToProject: vi.fn(),
    deleteEntry: vi.fn(),
  };

  const mockEventBus = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new DeleteEntryHandler(
      mockRepository as unknown as GlossaryRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete entry when user has MANAGER role and entry exists', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteEntry.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteEntryCommand('project-1', 'user-1', 'entry-1');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.entryBelongsToProject).toHaveBeenCalledWith('entry-1', 'project-1');
    expect(mockRepository.deleteEntry).toHaveBeenCalledWith('entry-1');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(GlossaryEntryDeletedEvent));
  });

  it('should delete entry when user has OWNER role', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteEntry.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteEntryCommand('project-1', 'user-1', 'entry-1');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
  });

  it('should throw ForbiddenError when user has MEMBER role', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Not authorized to perform this action')
    );

    const handler = createHandler();
    const command = new DeleteEntryCommand('project-1', 'user-1', 'entry-1');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockRepository.deleteEntry).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when entry does not belong to project', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(false);

    const handler = createHandler();
    const command = new DeleteEntryCommand('project-1', 'user-1', 'entry-1');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepository.deleteEntry).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should emit GlossaryEntryDeletedEvent after successful deletion', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteEntry.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteEntryCommand('project-1', 'user-1', 'entry-1');

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const event = mockEventBus.publish.mock.calls[0][0] as GlossaryEntryDeletedEvent;
    expect(event.projectId).toBe('project-1');
    expect(event.entryId).toBe('entry-1');
    expect(event.userId).toBe('user-1');
    expect(event.occurredAt).toBeInstanceOf(Date);
  });
});
