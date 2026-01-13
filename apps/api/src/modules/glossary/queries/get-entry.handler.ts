import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { GetEntryQuery } from './get-entry.query.js';

/**
 * Handler for GetEntryQuery.
 * Returns a single glossary entry by ID.
 */
export class GetEntryHandler implements IQueryHandler<GetEntryQuery> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetEntryQuery): Promise<InferQueryResult<GetEntryQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const belongsToProject = await this.glossaryRepository.entryBelongsToProject(
      query.entryId,
      query.projectId
    );
    if (!belongsToProject) {
      throw new NotFoundError('Glossary entry');
    }

    const entry = await this.glossaryRepository.getEntry(query.entryId);
    if (!entry) {
      throw new NotFoundError('Glossary entry');
    }

    return { entry };
  }
}
