import type { IQuery } from '../../../shared/cqrs/index.js';

export interface ExportGlossaryResult {
  content: string;
  contentType: string;
  filename: string;
}

/**
 * Query to export glossary entries to CSV or TBX format.
 */
export class ExportGlossaryQuery implements IQuery<ExportGlossaryResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ExportGlossaryResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly format: 'csv' | 'tbx',
    public readonly sourceLanguage?: string,
    public readonly targetLanguages?: string[],
    public readonly tagIds?: string[],
    public readonly domain?: string
  ) {}
}
