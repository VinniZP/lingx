import type { MTProviderType } from '../../../services/providers/index.js';
import type { ICommand } from '../../../shared/cqrs/index.js';

export interface QueuePreTranslateResult {
  message: string;
  jobId: string;
  totalKeys: number;
  targetLanguages: string[];
  estimatedCharacters: number;
  /** Warning if some keys have no source translation and will be skipped */
  warning?: string;
}

export interface QueuePreTranslateInput {
  branchId: string;
  targetLanguages: string[];
  provider?: MTProviderType;
}

/**
 * Command to queue pre-translation for all missing translations in a branch.
 */
export class QueuePreTranslateCommand implements ICommand<QueuePreTranslateResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: QueuePreTranslateResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: QueuePreTranslateInput
  ) {}
}
