import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { GetConfigsQuery } from './get-configs.query.js';

/**
 * Handler for GetConfigsQuery.
 * Returns all MT configurations for a project with masked API keys.
 */
export class GetConfigsHandler implements IQueryHandler<GetConfigsQuery> {
  constructor(
    private readonly mtRepository: MachineTranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetConfigsQuery): Promise<InferQueryResult<GetConfigsQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const configs = await this.mtRepository.getConfigs(query.projectId);

    return { configs };
  }
}
