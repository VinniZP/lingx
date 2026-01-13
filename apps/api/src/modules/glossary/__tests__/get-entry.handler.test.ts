import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../access/access.service.js';
import { GetEntryHandler } from '../queries/get-entry.handler.js';
import { GetEntryQuery } from '../queries/get-entry.query.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';

describe('GetEntryHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    getEntry: vi.fn(),
    entryBelongsToProject: vi.fn(),
  };

  const createHandler = () =>
    new GetEntryHandler(
      mockRepository as unknown as GlossaryRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEntry = {
    id: 'entry-1',
    projectId: 'project-1',
    sourceTerm: 'Hello',
    sourceLanguage: 'en',
    context: null,
    notes: null,
    partOfSpeech: null,
    caseSensitive: false,
    domain: null,
    usageCount: 0,
    lastUsedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    translations: [
      {
        id: 'trans-1',
        targetLanguage: 'de',
        targetTerm: 'Hallo',
        notes: null,
      },
    ],
    tags: [],
  };

  it('should return entry when user has access and entry exists', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    mockRepository.getEntry.mockResolvedValue(mockEntry);

    const handler = createHandler();
    const query = new GetEntryQuery('project-1', 'user-1', 'entry-1');

    const result = await handler.execute(query);

    expect(result.entry).toEqual(mockEntry);
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(mockRepository.entryBelongsToProject).toHaveBeenCalledWith('entry-1', 'project-1');
    expect(mockRepository.getEntry).toHaveBeenCalledWith('entry-1');
  });

  it('should throw ForbiddenError when user has no project access', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Not authorized to access this project')
    );

    const handler = createHandler();
    const query = new GetEntryQuery('project-1', 'user-1', 'entry-1');

    await expect(handler.execute(query)).rejects.toThrow(AppError);
    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should throw NotFoundError when entry does not belong to project', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(false);

    const handler = createHandler();
    const query = new GetEntryQuery('project-1', 'user-1', 'entry-1');

    await expect(handler.execute(query)).rejects.toThrow(AppError);
    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should throw NotFoundError when entry does not exist', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    mockRepository.getEntry.mockResolvedValue(null);

    const handler = createHandler();
    const query = new GetEntryQuery('project-1', 'user-1', 'entry-1');

    await expect(handler.execute(query)).rejects.toThrow(AppError);
    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 404 });
  });
});
