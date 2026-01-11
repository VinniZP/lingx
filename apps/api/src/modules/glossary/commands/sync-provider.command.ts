import type { ICommand } from '../../../shared/cqrs/index.js';

export interface SyncProviderResult {
  message: string;
  jobId?: string;
}

/**
 * Command to sync glossary to MT provider.
 * Requires MANAGER or OWNER role.
 */
export class SyncProviderCommand implements ICommand<SyncProviderResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: SyncProviderResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly provider: 'DEEPL' | 'GOOGLE_TRANSLATE',
    public readonly sourceLanguage: string,
    public readonly targetLanguage: string
  ) {}
}
