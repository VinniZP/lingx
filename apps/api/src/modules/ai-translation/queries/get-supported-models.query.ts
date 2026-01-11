import type { IQuery } from '../../../shared/cqrs/index.js';
import type { AIProviderType } from '../services/ai-provider.service.js';

export interface GetSupportedModelsResult {
  models: string[];
}

/**
 * Query to get supported models for an AI provider.
 */
export class GetSupportedModelsQuery implements IQuery<GetSupportedModelsResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetSupportedModelsResult;

  constructor(public readonly provider: AIProviderType) {}
}
