import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AIProviderService } from '../services/ai-provider.service.js';
import type { GetSupportedModelsQuery } from './get-supported-models.query.js';

/**
 * Handler for GetSupportedModelsQuery.
 * Returns supported models for an AI provider.
 */
export class GetSupportedModelsHandler implements IQueryHandler<GetSupportedModelsQuery> {
  constructor(private readonly aiProviderService: AIProviderService) {}

  async execute(
    query: GetSupportedModelsQuery
  ): Promise<InferQueryResult<GetSupportedModelsQuery>> {
    const models = this.aiProviderService.getSupportedModels(query.provider);

    return { models };
  }
}
