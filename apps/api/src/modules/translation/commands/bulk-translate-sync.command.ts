import type { ICommand, ProgressReporter } from '../../../shared/cqrs/index.js';

/**
 * Progress data for bulk translate sync jobs
 */
export interface BulkTranslateProgress {
  total: number;
  processed: number;
  translated: number;
  skipped: number;
  failed: number;
  currentKey?: string;
  currentLang?: string;
  errors?: Array<{ keyId: string; keyName: string; language: string; error: string }>;
}

/**
 * Result of synchronous bulk translation
 */
export interface BulkTranslateSyncResult {
  translated: number;
  skipped: number;
  failed: number;
  errors?: Array<{ keyId: string; keyName: string; language: string; error: string }>;
}

/**
 * Internal command for synchronous bulk translation.
 *
 * This command handles the actual translation work, used by:
 * - BulkTranslateHandler for small batches (direct execution)
 * - MT batch worker for large batches (async execution)
 *
 * Unlike BulkTranslateCommand, this command always executes synchronously
 * and never queues to a worker (to avoid infinite loops).
 */
export class BulkTranslateSyncCommand implements ICommand<BulkTranslateSyncResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: BulkTranslateSyncResult;

  constructor(
    public readonly projectId: string,
    public readonly branchId: string,
    public readonly keyIds: string[],
    public readonly targetLanguages: string[],
    public readonly sourceLanguage: string,
    public readonly provider: 'MT' | 'AI',
    public readonly userId: string,
    public readonly progressReporter?: ProgressReporter
  ) {}
}
