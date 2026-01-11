import type { IQuery } from '../../../shared/cqrs/index.js';
import type { MTUsageStats } from '../repositories/machine-translation.repository.js';

export interface GetUsageResult {
  providers: MTUsageStats[];
}

/**
 * Query to get MT usage statistics for a project.
 */
export class GetUsageQuery implements IQuery<GetUsageResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetUsageResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
