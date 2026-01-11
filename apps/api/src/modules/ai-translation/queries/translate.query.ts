import type { IQuery } from '../../../shared/cqrs/index.js';
import type { AIProviderType } from '../services/ai-provider.service.js';

export interface TranslateInput {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  keyId?: string;
  branchId?: string;
  provider?: AIProviderType;
}

export interface TranslateResult {
  text: string;
  provider: AIProviderType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
  context?: {
    glossaryTerms: number;
    tmMatches: number;
    relatedKeys: number;
  };
}

/**
 * Query to translate text using AI with context.
 */
export class TranslateQuery implements IQuery<TranslateResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: TranslateResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: TranslateInput
  ) {}
}
