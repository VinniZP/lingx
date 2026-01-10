import type { MTProviderType } from '../../../services/providers/index.js';
import type { ICommand, ProgressReporter } from '../../../shared/cqrs/index.js';

/**
 * Result of batch key translation
 */
export interface BatchTranslateKeysResult {
  translated: number;
  skipped: number;
  failed: number;
}

/**
 * Command to batch translate specific keys to a single target language.
 *
 * This command handles the `translate-batch` worker job type.
 * It translates a list of keys to ONE target language using MT.
 *
 * Features:
 * - Respects existing translations (skip unless overwriteExisting)
 * - Rate-limited batch processing
 * - Progress reporting via optional ProgressReporter
 */
export class BatchTranslateKeysCommand implements ICommand<BatchTranslateKeysResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: BatchTranslateKeysResult;

  constructor(
    public readonly projectId: string,
    public readonly keyIds: string[],
    public readonly targetLanguage: string,
    public readonly userId: string,
    public readonly provider?: MTProviderType,
    public readonly overwriteExisting?: boolean,
    public readonly progressReporter?: ProgressReporter
  ) {}
}
