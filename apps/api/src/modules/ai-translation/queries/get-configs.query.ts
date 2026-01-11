import type { IQuery } from '../../../shared/cqrs/index.js';
import type { AIConfigResponse } from '../repositories/ai-translation.repository.js';

export interface GetConfigsResult {
  configs: AIConfigResponse[];
}

/**
 * Query to get all AI configurations for a project.
 */
export class GetConfigsQuery implements IQuery<GetConfigsResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetConfigsResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
