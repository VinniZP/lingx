import type { MTProviderType } from '../../../services/providers/index.js';
import type { IQuery } from '../../../shared/cqrs/index.js';

export interface TranslateMultiTranslation {
  translatedText: string;
  provider: MTProviderType;
  cached: boolean;
  characterCount: number;
}

export interface TranslateMultiError {
  language: string;
  error: string;
}

export interface TranslateMultiResult {
  translations: Record<string, TranslateMultiTranslation>;
  totalCharacters: number;
  /** Errors for languages that failed to translate */
  errors?: TranslateMultiError[];
  /** True if some translations succeeded but others failed */
  partialSuccess?: boolean;
}

export interface TranslateMultiInput {
  text: string;
  sourceLanguage: string;
  targetLanguages: string[];
  provider?: MTProviderType;
}

/**
 * Query to translate a single text to multiple target languages.
 */
export class TranslateMultiQuery implements IQuery<TranslateMultiResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: TranslateMultiResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: TranslateMultiInput
  ) {}
}
