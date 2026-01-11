import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { ExportGlossaryQuery } from './export-glossary.query.js';

/**
 * Handler for ExportGlossaryQuery.
 * Exports glossary entries to CSV or TBX format.
 */
export class ExportGlossaryHandler implements IQueryHandler<ExportGlossaryQuery> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: ExportGlossaryQuery): Promise<InferQueryResult<ExportGlossaryQuery>> {
    await this.accessService.verifyProjectAccess(query.userId, query.projectId);

    const options = {
      sourceLanguage: query.sourceLanguage,
      targetLanguages: query.targetLanguages,
      tagIds: query.tagIds,
      domain: query.domain,
    };

    const content =
      query.format === 'csv'
        ? await this.glossaryRepository.exportToCSV(query.projectId, options)
        : await this.glossaryRepository.exportToTBX(query.projectId, options);

    const contentType = query.format === 'csv' ? 'text/csv' : 'application/x-tbx+xml';
    const filename = `glossary.${query.format}`;

    return { content, contentType, filename };
  }
}
