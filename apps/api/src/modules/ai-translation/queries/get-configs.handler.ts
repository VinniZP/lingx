import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';
import type { GetConfigsQuery } from './get-configs.query.js';

/**
 * Handler for GetConfigsQuery.
 * Returns all AI configurations for a project with masked API keys.
 */
export class GetConfigsHandler implements IQueryHandler<GetConfigsQuery> {
  constructor(
    private readonly aiRepository: AITranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetConfigsQuery): Promise<InferQueryResult<GetConfigsQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const configs = await this.aiRepository.getConfigs(query.projectId);

    return { configs };
  }
}
