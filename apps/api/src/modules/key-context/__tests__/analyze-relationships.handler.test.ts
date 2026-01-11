import type { RelationshipType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { KeyContextService } from '../../../services/key-context.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { AnalyzeRelationshipsCommand } from '../commands/analyze-relationships.command.js';
import { AnalyzeRelationshipsHandler } from '../commands/analyze-relationships.handler.js';
import { RelationshipsAnalyzedEvent } from '../events/relationships-analyzed.event.js';

describe('AnalyzeRelationshipsHandler', () => {
  const mockKeyContextService: { computeSemanticRelationships: ReturnType<typeof vi.fn> } = {
    computeSemanticRelationships: vi.fn(),
  };

  const mockAccessService: { verifyBranchAccess: ReturnType<typeof vi.fn> } = {
    verifyBranchAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new AnalyzeRelationshipsHandler(
      mockKeyContextService as unknown as KeyContextService,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze semantic relationships and emit event when user is authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockKeyContextService.computeSemanticRelationships.mockResolvedValue({ relationships: 42 });
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new AnalyzeRelationshipsCommand(
      'branch-1',
      ['SEMANTIC'] as RelationshipType[],
      0.7,
      'user-1'
    );

    const result = await handler.execute(command);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockKeyContextService.computeSemanticRelationships).toHaveBeenCalledWith(
      'branch-1',
      'en',
      0.7
    );

    // Verify event was published
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as RelationshipsAnalyzedEvent;
    expect(publishedEvent).toBeInstanceOf(RelationshipsAnalyzedEvent);
    expect(publishedEvent.branchId).toBe('branch-1');
    expect(publishedEvent.types).toEqual(['SEMANTIC']);
    expect(publishedEvent.userId).toBe('user-1');

    expect(result.status).toBe('completed');
    expect(result.jobId).toMatch(/^ctx-\d+-[a-z0-9]+$/);
  });

  it('should throw ForbiddenError when user is not authorized', async () => {
    const handler = createHandler();

    const forbiddenError = new ForbiddenError();
    mockAccessService.verifyBranchAccess.mockRejectedValue(forbiddenError);

    const command = new AnalyzeRelationshipsCommand(
      'branch-1',
      ['SEMANTIC'] as RelationshipType[],
      0.7,
      'user-1'
    );

    await expect(handler.execute(command)).rejects.toBe(forbiddenError);

    expect(mockKeyContextService.computeSemanticRelationships).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate service exceptions', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockKeyContextService.computeSemanticRelationships.mockRejectedValue(
      new Error('Embedding service failed')
    );

    const command = new AnalyzeRelationshipsCommand(
      'branch-1',
      ['SEMANTIC'] as RelationshipType[],
      0.7,
      'user-1'
    );

    await expect(handler.execute(command)).rejects.toThrow('Embedding service failed');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should propagate event bus failures', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockKeyContextService.computeSemanticRelationships.mockResolvedValue({ relationships: 42 });
    mockEventBus.publish.mockRejectedValue(new Error('Event bus unavailable'));

    const command = new AnalyzeRelationshipsCommand(
      'branch-1',
      ['SEMANTIC'] as RelationshipType[],
      0.7,
      'user-1'
    );

    await expect(handler.execute(command)).rejects.toThrow('Event bus unavailable');
  });

  it('should use custom minSimilarity value', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'de',
      languages: ['de'],
    });
    mockKeyContextService.computeSemanticRelationships.mockResolvedValue({ relationships: 10 });
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new AnalyzeRelationshipsCommand(
      'branch-1',
      ['SEMANTIC'] as RelationshipType[],
      0.85,
      'user-1'
    );

    await handler.execute(command);

    expect(mockKeyContextService.computeSemanticRelationships).toHaveBeenCalledWith(
      'branch-1',
      'de',
      0.85
    );
  });

  it('should fallback to "en" if project has no defaultLanguage', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: null,
      languages: [],
    });
    mockKeyContextService.computeSemanticRelationships.mockResolvedValue({ relationships: 5 });
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new AnalyzeRelationshipsCommand(
      'branch-1',
      ['SEMANTIC'] as RelationshipType[],
      0.7,
      'user-1'
    );

    await handler.execute(command);

    expect(mockKeyContextService.computeSemanticRelationships).toHaveBeenCalledWith(
      'branch-1',
      'en',
      0.7
    );
  });

  it('should skip analysis if SEMANTIC is not in types', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockEventBus.publish.mockResolvedValue(undefined);

    // Empty types array (no SEMANTIC)
    const command = new AnalyzeRelationshipsCommand(
      'branch-1',
      [] as RelationshipType[],
      0.7,
      'user-1'
    );

    const result = await handler.execute(command);

    expect(mockKeyContextService.computeSemanticRelationships).not.toHaveBeenCalled();
    expect(result.status).toBe('completed');
  });
});
