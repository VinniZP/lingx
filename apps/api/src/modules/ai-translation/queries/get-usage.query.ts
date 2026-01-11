import type { IQuery } from '../../../shared/cqrs/index.js';
import type { AIUsageStats } from '../repositories/ai-translation.repository.js';

export interface GetUsageResult {
  providers: AIUsageStats[];
}

/**
 * Query to get AI usage statistics for a project.
 */
export class GetUsageQuery implements IQuery<GetUsageResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetUsageResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
