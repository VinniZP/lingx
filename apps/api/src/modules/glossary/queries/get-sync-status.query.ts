import type { IQuery } from '../../../shared/cqrs/index.js';
import type { GlossarySyncStatus } from '../repositories/glossary.repository.js';

export interface GetSyncStatusResult {
  syncs: Array<
    Omit<GlossarySyncStatus, 'lastSyncedAt'> & {
      lastSyncedAt: string;
    }
  >;
}

/**
 * Query to get MT provider sync status for a project.
 */
export class GetSyncStatusQuery implements IQuery<GetSyncStatusResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetSyncStatusResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
