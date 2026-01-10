import type { ICommand } from '../../../shared/cqrs/index.js';

export interface BulkTranslateSyncResult {
  translated: number;
  skipped: number;
  failed: number;
  errors?: Array<{ keyId: string; language: string; error: string }>;
}

export interface BulkTranslateAsyncResult {
  jobId: string;
  async: true;
}

export type BulkTranslateResult = BulkTranslateSyncResult | BulkTranslateAsyncResult;

/**
 * Command to bulk translate empty translations for selected keys.
 * For small batches: sync processing with immediate result.
 * For large batches: queued for background processing.
 */
export class BulkTranslateCommand implements ICommand<BulkTranslateResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: BulkTranslateResult;

  constructor(
    public readonly branchId: string,
    public readonly keyIds: string[],
    public readonly targetLanguages: string[] | undefined,
    public readonly provider: 'MT' | 'AI',
    public readonly userId: string
  ) {}
}
