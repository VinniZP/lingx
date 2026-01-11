import type { QualityIssue } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

export interface GetKeyIssuesResult {
  issues: Record<string, QualityIssue[]>;
}

/**
 * Query to get quality issues for all translations of a key.
 */
export class GetKeyIssuesQuery implements IQuery<GetKeyIssuesResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetKeyIssuesResult;

  constructor(
    public readonly keyId: string,
    public readonly userId: string
  ) {}
}
