import type { ICommand } from '../../../shared/cqrs/index.js';

export interface DeleteProviderSyncResult {
  success: boolean;
}

/**
 * Command to remove glossary from MT provider.
 * Requires MANAGER or OWNER role.
 */
export class DeleteProviderSyncCommand implements ICommand<DeleteProviderSyncResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: DeleteProviderSyncResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly provider: 'DEEPL' | 'GOOGLE_TRANSLATE',
    public readonly sourceLanguage: string,
    public readonly targetLanguage: string
  ) {}
}
