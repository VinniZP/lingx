import type { ICommand } from '../../../shared/cqrs/index.js';
import type { KeyWithTranslations } from '../repositories/translation.repository.js';

/**
 * Command to update all translations for a key at once.
 */
export class UpdateKeyTranslationsCommand implements ICommand<KeyWithTranslations> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: KeyWithTranslations;

  constructor(
    public readonly keyId: string,
    public readonly translations: Record<string, string>,
    public readonly userId: string
  ) {}
}
