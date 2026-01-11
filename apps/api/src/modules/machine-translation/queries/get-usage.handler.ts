import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { GetUsageQuery } from './get-usage.query.js';

/**
 * Handler for GetUsageQuery.
 * Returns MT usage statistics for a project.
 */
export class GetUsageHandler implements IQueryHandler<GetUsageQuery> {
  constructor(
    private readonly mtRepository: MachineTranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetUsageQuery): Promise<InferQueryResult<GetUsageQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const providers = await this.mtRepository.getUsage(query.projectId);

    return { providers };
  }
}
