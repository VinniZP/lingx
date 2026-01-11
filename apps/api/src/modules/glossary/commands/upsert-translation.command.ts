import type { ICommand } from '../../../shared/cqrs/index.js';

export interface UpsertTranslationResult {
  success: boolean;
}

/**
 * Command to add or update a translation for a glossary entry.
 */
export class UpsertTranslationCommand implements ICommand<UpsertTranslationResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: UpsertTranslationResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly entryId: string,
    public readonly targetLanguage: string,
    public readonly targetTerm: string,
    public readonly notes?: string | null
  ) {}
}
