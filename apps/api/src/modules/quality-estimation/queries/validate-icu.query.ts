import type { IQuery } from '../../../shared/cqrs/index.js';

export interface ValidateICUResult {
  valid: boolean;
  error?: string;
}

/**
 * Query to validate ICU MessageFormat syntax.
 * Does not require authentication as it's a pure validation operation.
 */
export class ValidateICUQuery implements IQuery<ValidateICUResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ValidateICUResult;

  constructor(public readonly text: string) {}
}
