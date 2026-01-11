import type { QualityEstimationService } from '../../../services/quality-estimation.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ValidateICUQuery } from './validate-icu.query.js';

/**
 * Handler for ValidateICUQuery.
 * Validates ICU MessageFormat syntax.
 */
export class ValidateICUHandler implements IQueryHandler<ValidateICUQuery> {
  constructor(private readonly qualityEstimationService: QualityEstimationService) {}

  async execute(query: ValidateICUQuery): Promise<InferQueryResult<ValidateICUQuery>> {
    return this.qualityEstimationService.validateICUSyntax(query.text);
  }
}
