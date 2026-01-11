import type { IQuery } from '../../../shared/cqrs/index.js';
import type { GlossaryMatch } from '../repositories/glossary.repository.js';

export interface SearchInTextResult {
  matches: GlossaryMatch[];
}

/**
 * Query to search for glossary terms within source text.
 *
 * Note: Case sensitivity is determined by each entry's individual `caseSensitive` field,
 * not by a query parameter. This ensures consistent search behavior across all entries.
 */
export class SearchInTextQuery implements IQuery<SearchInTextResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: SearchInTextResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly sourceText: string,
    public readonly sourceLanguage: string,
    public readonly targetLanguage: string,
    public readonly limit?: number
  ) {}
}
