import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { CheckBranchQualityHandler } from '../queries/check-branch-quality.handler.js';
import { CheckBranchQualityQuery } from '../queries/check-branch-quality.query.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('CheckBranchQualityHandler', () => {
  const mockRepository: {
    checkBranchQuality: ReturnType<typeof vi.fn>;
  } = {
    checkBranchQuality: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
  };

  let handler: CheckBranchQualityHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CheckBranchQualityHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService
    );
  });

  it('should check quality for all keys in branch', async () => {
    const query = new CheckBranchQualityQuery('branch-1', 'user-1', undefined);

    const mockQualityResults = {
      totalKeys: 10,
      keysWithIssues: 1,
      results: [
        {
          keyId: 'key-1',
          keyName: 'common.greeting',
          issues: [
            { language: 'es', type: 'PUNCTUATION_MISMATCH', message: 'Punctuation differs' },
          ],
        },
      ],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.checkBranchQuality.mockResolvedValue(mockQualityResults);

    const result = await handler.execute(query);

    expect(result).toEqual(mockQualityResults);
    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockRepository.checkBranchQuality).toHaveBeenCalledWith('branch-1', 'en', undefined);
  });

  it('should check quality for specific keys when keyIds provided', async () => {
    const keyIds = ['key-1', 'key-2'];
    const query = new CheckBranchQualityQuery('branch-1', 'user-1', keyIds);

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.checkBranchQuality.mockResolvedValue({
      totalKeys: 2,
      keysWithIssues: 0,
      results: [],
    });

    await handler.execute(query);

    expect(mockRepository.checkBranchQuality).toHaveBeenCalledWith('branch-1', 'en', keyIds);
  });

  it('should use project default language for quality check', async () => {
    const query = new CheckBranchQualityQuery('branch-1', 'user-1', undefined);

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'fr', // French as default
      languages: ['fr', 'en', 'es'],
    });
    mockRepository.checkBranchQuality.mockResolvedValue({
      totalKeys: 0,
      keysWithIssues: 0,
      results: [],
    });

    await handler.execute(query);

    expect(mockRepository.checkBranchQuality).toHaveBeenCalledWith('branch-1', 'fr', undefined);
  });

  it('should throw when user lacks branch access', async () => {
    const query = new CheckBranchQualityQuery('branch-1', 'user-1', undefined);

    mockAccessService.verifyBranchAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(query)).rejects.toThrow('Not authorized');
    expect(mockRepository.checkBranchQuality).not.toHaveBeenCalled();
  });

  it('should return empty results for branch with no issues', async () => {
    const query = new CheckBranchQualityQuery('branch-1', 'user-1', undefined);

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.checkBranchQuality.mockResolvedValue({
      totalKeys: 50,
      keysWithIssues: 0,
      results: [],
    });

    const result = await handler.execute(query);

    expect(result.results).toHaveLength(0);
    expect(result.keysWithIssues).toBe(0);
  });

  it('should handle multiple issues per key', async () => {
    const query = new CheckBranchQualityQuery('branch-1', 'user-1', undefined);

    const mockQualityResults = {
      totalKeys: 10,
      keysWithIssues: 1,
      results: [
        {
          keyId: 'key-1',
          keyName: 'common.greeting',
          issues: [
            { language: 'es', type: 'PUNCTUATION_MISMATCH', message: 'Punctuation differs' },
            { language: 'es', type: 'LENGTH_DIFFERENCE', message: 'Translation is too long' },
            { language: 'fr', type: 'WHITESPACE_MISMATCH', message: 'Whitespace differs' },
          ],
        },
      ],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es', 'fr'],
    });
    mockRepository.checkBranchQuality.mockResolvedValue(mockQualityResults);

    const result = await handler.execute(query);

    expect(result.results[0].issues).toHaveLength(3);
    expect(result.keysWithIssues).toBe(1);
  });
});
