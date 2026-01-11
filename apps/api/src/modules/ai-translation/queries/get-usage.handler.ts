import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';
import type { GetUsageQuery } from './get-usage.query.js';

/**
 * Handler for GetUsageQuery.
 * Returns AI usage statistics for a project.
 */
export class GetUsageHandler implements IQueryHandler<GetUsageQuery> {
  constructor(
    private readonly aiRepository: AITranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetUsageQuery): Promise<InferQueryResult<GetUsageQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const providers = await this.aiRepository.getUsage(query.projectId);

    return { providers };
  }
}
