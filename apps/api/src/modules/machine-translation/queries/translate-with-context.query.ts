import type { MTProviderType } from '../../../services/providers/index.js';
import type { IQuery } from '../../../shared/cqrs/index.js';

export interface TranslateWithContextResult {
  translatedText: string;
  provider: MTProviderType;
  cached: boolean;
  characterCount: number;
  context?: {
    relatedTranslations: number;
    glossaryTerms: number;
  };
  /** Indicates context could not be loaded; translation performed without enrichment */
  contextFetchFailed?: boolean;
  /** Warning message when context fetch failed */
  warning?: string;
}

export interface TranslateWithContextInput {
  branchId: string;
  keyId: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider?: MTProviderType;
}

/**
 * Query to translate text with AI context enrichment.
 * Uses related translations and glossary terms to improve translation quality.
 */
export class TranslateWithContextQuery implements IQuery<TranslateWithContextResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: TranslateWithContextResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: TranslateWithContextInput
  ) {}
}
