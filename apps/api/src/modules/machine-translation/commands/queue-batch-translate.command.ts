import type { MTProviderType } from '../../../services/providers/index.js';
import type { ICommand } from '../../../shared/cqrs/index.js';

export interface QueueBatchTranslateResult {
  message: string;
  jobId: string | undefined;
  totalKeys: number;
  estimatedCharacters: number;
  /** Warning if some keys have no source translation and will be skipped */
  warning?: string;
}

export interface QueueBatchTranslateInput {
  keyIds: string[];
  targetLanguage: string;
  provider?: MTProviderType;
  overwriteExisting?: boolean;
}

/**
 * Command to queue batch translation for multiple keys.
 */
export class QueueBatchTranslateCommand implements ICommand<QueueBatchTranslateResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: QueueBatchTranslateResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: QueueBatchTranslateInput
  ) {}
}
