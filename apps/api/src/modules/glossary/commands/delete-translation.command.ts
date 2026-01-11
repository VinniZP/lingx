import type { ICommand } from '../../../shared/cqrs/index.js';

export interface DeleteTranslationResult {
  success: boolean;
}

/**
 * Command to delete a translation from a glossary entry.
 * Requires MANAGER or OWNER role.
 */
export class DeleteTranslationCommand implements ICommand<DeleteTranslationResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: DeleteTranslationResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly entryId: string,
    public readonly targetLanguage: string
  ) {}
}
