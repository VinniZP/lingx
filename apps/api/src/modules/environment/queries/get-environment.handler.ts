import type { IQueryHandler } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import type { GetEnvironmentQuery, GetEnvironmentResult } from './get-environment.query.js';

/**
 * Handler for GetEnvironmentQuery.
 * Retrieves a single environment by ID.
 */
export class GetEnvironmentHandler implements IQueryHandler<
  GetEnvironmentQuery,
  GetEnvironmentResult
> {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(query: GetEnvironmentQuery): Promise<GetEnvironmentResult> {
    return this.environmentRepository.findById(query.id);
  }
}
