import type { RelationshipType } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Result of relationship analysis.
 */
export interface AnalyzeRelationshipsResult {
  jobId: string;
  status: 'completed' | 'queued';
}

/**
 * Command to trigger relationship analysis for a branch.
 * Currently only SEMANTIC is supported; other types are computed during context updates.
 */
export class AnalyzeRelationshipsCommand implements ICommand<AnalyzeRelationshipsResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: AnalyzeRelationshipsResult;

  constructor(
    public readonly branchId: string,
    public readonly types: RelationshipType[],
    public readonly minSimilarity: number,
    public readonly userId: string
  ) {}
}
