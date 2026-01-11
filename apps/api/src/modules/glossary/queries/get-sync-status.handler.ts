import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { GetSyncStatusQuery } from './get-sync-status.query.js';

/**
 * Handler for GetSyncStatusQuery.
 * Returns MT provider sync status for a project.
 */
export class GetSyncStatusHandler implements IQueryHandler<GetSyncStatusQuery> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetSyncStatusQuery): Promise<InferQueryResult<GetSyncStatusQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const syncs = await this.glossaryRepository.getSyncStatus(query.projectId);

    return {
      syncs: syncs.map((s) => ({
        ...s,
        lastSyncedAt: s.lastSyncedAt.toISOString(),
      })),
    };
  }
}
