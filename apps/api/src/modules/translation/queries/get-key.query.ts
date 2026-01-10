import type { IQuery } from '../../../shared/cqrs/index.js';
import type { KeyWithTranslations } from '../repositories/translation.repository.js';

/**
 * Query to get a single translation key with its translations.
 */
export class GetKeyQuery implements IQuery<KeyWithTranslations> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: KeyWithTranslations;

  constructor(
    public readonly keyId: string,
    public readonly userId: string
  ) {}
}
