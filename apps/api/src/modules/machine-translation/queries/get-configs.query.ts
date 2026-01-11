import type { IQuery } from '../../../shared/cqrs/index.js';
import type { MTConfigResponse } from '../repositories/machine-translation.repository.js';

export interface GetConfigsResult {
  configs: MTConfigResponse[];
}

/**
 * Query to get all MT configurations for a project.
 */
export class GetConfigsQuery implements IQuery<GetConfigsResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetConfigsResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
