import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import type { GetEnvironmentQuery } from './get-environment.query.js';

/**
 * Handler for GetEnvironmentQuery.
 * Retrieves a single environment by ID.
 *
 * Authorization: Requires membership in the project.
 * Returns 404 for both non-existent resources and unauthorized access
 * to prevent information disclosure about resource existence.
 */
export class GetEnvironmentHandler implements IQueryHandler<GetEnvironmentQuery> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetEnvironmentQuery): Promise<InferQueryResult<GetEnvironmentQuery>> {
    const { id, userId } = query;

    const environment = await this.environmentRepository.findById(id);
    if (!environment) {
      throw new NotFoundError('Environment');
    }

    // Authorization: requires project membership (any role)
    // Return 404 instead of 403 to hide resource existence from unauthorized users
    try {
      await this.accessService.verifyProjectAccess(userId, environment.projectId);
    } catch (error) {
      // Check by error code (more reliable than instanceof across module boundaries)
      if (error instanceof Error && 'code' in error && error.code === 'FORBIDDEN') {
        throw new NotFoundError('Environment');
      }
      throw error;
    }

    return environment;
  }
}
