import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteTranslationCommand } from '../commands/delete-translation.command.js';
import { DeleteTranslationHandler } from '../commands/delete-translation.handler.js';
import { GlossaryTranslationDeletedEvent } from '../events/glossary-translation-deleted.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';

describe('DeleteTranslationHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    entryBelongsToProject: vi.fn(),
    deleteTranslation: vi.fn(),
  };

  const mockEventBus = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new DeleteTranslationHandler(
      mockRepository as unknown as GlossaryRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete translation when user has MANAGER role and entry exists', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteTranslation.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteTranslationCommand('project-1', 'user-1', 'entry-1', 'de');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.entryBelongsToProject).toHaveBeenCalledWith('entry-1', 'project-1');
    expect(mockRepository.deleteTranslation).toHaveBeenCalledWith('entry-1', 'de');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(GlossaryTranslationDeletedEvent));
  });

  it('should delete translation when user has OWNER role', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteTranslation.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteTranslationCommand('project-1', 'user-1', 'entry-1', 'fr');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockRepository.deleteTranslation).toHaveBeenCalledWith('entry-1', 'fr');
  });

  it('should throw ForbiddenError when user has MEMBER role', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Not authorized to perform this action')
    );

    const handler = createHandler();
    const command = new DeleteTranslationCommand('project-1', 'user-1', 'entry-1', 'de');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockRepository.deleteTranslation).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when entry does not belong to project', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(false);

    const handler = createHandler();
    const command = new DeleteTranslationCommand('project-1', 'user-1', 'entry-1', 'de');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepository.deleteTranslation).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should emit GlossaryTranslationDeletedEvent after successful deletion', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    mockRepository.deleteTranslation.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteTranslationCommand('project-1', 'user-1', 'entry-1', 'de');

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const event = mockEventBus.publish.mock.calls[0][0] as GlossaryTranslationDeletedEvent;
    expect(event.projectId).toBe('project-1');
    expect(event.entryId).toBe('entry-1');
    expect(event.targetLanguage).toBe('de');
    expect(event.userId).toBe('user-1');
    expect(event.occurredAt).toBeInstanceOf(Date);
  });
});
