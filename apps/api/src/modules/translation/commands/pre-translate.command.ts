import type { MTProviderType } from '../../../services/providers/index.js';
import type { ICommand, ProgressReporter } from '../../../shared/cqrs/index.js';

/**
 * Result of pre-translation
 */
export interface PreTranslateResult {
  translated: number;
  skipped: number;
  failed: number;
}

/**
 * Command to pre-translate missing translations for a branch.
 *
 * This command handles the `pre-translate` worker job type.
 * It fills in missing translations for all keys in a branch.
 *
 * Features:
 * - Only translates empty translations
 * - Supports multiple target languages
 * - Rate-limited batch processing
 * - Progress reporting via optional ProgressReporter
 */
export class PreTranslateCommand implements ICommand<PreTranslateResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: PreTranslateResult;

  constructor(
    public readonly projectId: string,
    public readonly branchId: string,
    public readonly targetLanguages: string[],
    public readonly userId: string,
    public readonly provider?: MTProviderType,
    public readonly progressReporter?: ProgressReporter
  ) {}
}
