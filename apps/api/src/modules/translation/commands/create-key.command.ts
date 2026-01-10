import type { ICommand } from '../../../shared/cqrs/index.js';
import type { KeyWithTranslations } from '../repositories/translation.repository.js';

/**
 * Command to create a new translation key.
 */
export class CreateKeyCommand implements ICommand<KeyWithTranslations> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: KeyWithTranslations;

  constructor(
    public readonly branchId: string,
    public readonly name: string,
    public readonly namespace: string | null,
    public readonly description: string | null,
    public readonly userId: string
  ) {}
}
