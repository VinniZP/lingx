import type { ICommand } from '../../../shared/cqrs/index.js';
import type { KeyWithTranslations } from '../repositories/translation.repository.js';

/**
 * Command to update a translation key.
 */
export class UpdateKeyCommand implements ICommand<KeyWithTranslations> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: KeyWithTranslations;

  constructor(
    public readonly keyId: string,
    public readonly name: string | undefined,
    public readonly namespace: string | null | undefined,
    public readonly description: string | undefined,
    public readonly userId: string
  ) {}
}
