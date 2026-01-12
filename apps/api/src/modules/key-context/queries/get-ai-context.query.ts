import type { IQuery } from '../../../shared/cqrs/index.js';
import type { AIContextResult } from '../key-context.service.js';

// Re-export for module consumers
export type { AIContextResult } from '../key-context.service.js';

/**
 * Query to get AI context for a key (for translation UI).
 * Handler fetches project's defaultLanguage internally.
 */
export class GetAIContextQuery implements IQuery<AIContextResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: AIContextResult;

  constructor(
    public readonly branchId: string,
    public readonly keyId: string,
    public readonly targetLanguage: string,
    public readonly userId: string
  ) {}
}
