import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../access/access.service.js';
import { SearchTMHandler } from '../queries/search-tm.handler.js';
import { SearchTMQuery } from '../queries/search-tm.query.js';
import type {
  TMMatch,
  TranslationMemoryRepository,
} from '../repositories/translation-memory.repository.js';

describe('SearchTMHandler', () => {
  const mockRepository: {
    searchSimilar: ReturnType<typeof vi.fn>;
  } = {
    searchSimilar: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  let handler: SearchTMHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SearchTMHandler(
      mockRepository as unknown as TranslationMemoryRepository,
      mockAccessService as unknown as AccessService
    );
  });

  it('should verify project access before searching', async () => {
    const query = new SearchTMQuery('project-1', 'user-1', 'Hello world', 'en', 'de');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.searchSimilar.mockResolvedValue([]);

    await handler.execute(query);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
  });

  it('should return TM matches from repository', async () => {
    const query = new SearchTMQuery('project-1', 'user-1', 'Hello world', 'en', 'de', 0.7, 10);

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);

    const mockMatches: TMMatch[] = [
      {
        id: 'tm-1',
        sourceText: 'Hello world',
        targetText: 'Hallo Welt',
        similarity: 1.0,
        matchType: 'exact',
        usageCount: 5,
        lastUsedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'tm-2',
        sourceText: 'Hello there',
        targetText: 'Hallo da',
        similarity: 0.85,
        matchType: 'fuzzy',
        usageCount: 2,
        lastUsedAt: '2024-01-02T00:00:00.000Z',
      },
    ];
    mockRepository.searchSimilar.mockResolvedValue(mockMatches);

    const result = await handler.execute(query);

    expect(mockRepository.searchSimilar).toHaveBeenCalledWith({
      projectId: 'project-1',
      sourceText: 'Hello world',
      sourceLanguage: 'en',
      targetLanguage: 'de',
      minSimilarity: 0.7,
      limit: 10,
    });
    expect(result).toEqual({ matches: mockMatches });
  });

  it('should use default values for optional parameters', async () => {
    const query = new SearchTMQuery('project-1', 'user-1', 'Test text', 'en', 'fr');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.searchSimilar.mockResolvedValue([]);

    await handler.execute(query);

    expect(mockRepository.searchSimilar).toHaveBeenCalledWith({
      projectId: 'project-1',
      sourceText: 'Test text',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      minSimilarity: undefined,
      limit: undefined,
    });
  });

  it('should throw when user lacks project access', async () => {
    const query = new SearchTMQuery('project-1', 'user-1', 'Hello', 'en', 'de');

    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new Error('Access to this project is not allowed')
    );

    await expect(handler.execute(query)).rejects.toThrow('Access to this project is not allowed');
    expect(mockRepository.searchSimilar).not.toHaveBeenCalled();
  });

  it('should return empty matches for short source text (repository behavior)', async () => {
    const query = new SearchTMQuery('project-1', 'user-1', 'Hi', 'en', 'de');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    // Repository returns empty for short text (<3 chars)
    mockRepository.searchSimilar.mockResolvedValue([]);

    const result = await handler.execute(query);

    expect(mockRepository.searchSimilar).toHaveBeenCalledWith({
      projectId: 'project-1',
      sourceText: 'Hi',
      sourceLanguage: 'en',
      targetLanguage: 'de',
      minSimilarity: undefined,
      limit: undefined,
    });
    expect(result).toEqual({ matches: [] });
  });
});
