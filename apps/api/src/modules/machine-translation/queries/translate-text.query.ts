import type { MTProviderType } from '../../../services/providers/index.js';
import type { IQuery } from '../../../shared/cqrs/index.js';

export interface TranslateTextResult {
  translatedText: string;
  provider: MTProviderType;
  cached: boolean;
  characterCount: number;
}

export interface TranslateTextInput {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider?: MTProviderType;
}

/**
 * Query to translate a single text using machine translation.
 */
export class TranslateTextQuery implements IQuery<TranslateTextResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: TranslateTextResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: TranslateTextInput
  ) {}
}
