import type { IQuery } from '../../../shared/cqrs/index.js';
import type { AIContextConfigInput } from '../repositories/ai-translation.repository.js';

/**
 * Query to get AI context configuration for a project.
 */
export class GetContextConfigQuery implements IQuery<AIContextConfigInput> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: AIContextConfigInput;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
