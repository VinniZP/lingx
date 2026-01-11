import type { IQuery } from '../../../shared/cqrs/index.js';
import type { TMMatch } from '../repositories/translation-memory.repository.js';

export interface SearchTMResult {
  matches: TMMatch[];
}

/**
 * Query to search translation memory for similar translations.
 */
export class SearchTMQuery implements IQuery<SearchTMResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: SearchTMResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly sourceText: string,
    public readonly sourceLanguage: string,
    public readonly targetLanguage: string,
    public readonly minSimilarity?: number,
    public readonly limit?: number
  ) {}
}
