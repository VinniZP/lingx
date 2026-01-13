import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';
import type { GetContextConfigQuery } from './get-context-config.query.js';

/**
 * Handler for GetContextConfigQuery.
 * Returns AI context configuration for a project.
 */
export class GetContextConfigHandler implements IQueryHandler<GetContextConfigQuery> {
  constructor(
    private readonly aiRepository: AITranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetContextConfigQuery): Promise<InferQueryResult<GetContextConfigQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    return this.aiRepository.getContextConfig(query.projectId);
  }
}
