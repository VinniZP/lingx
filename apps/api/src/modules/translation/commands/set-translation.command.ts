import type { Translation } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to set a translation for a key in a specific language.
 */
export class SetTranslationCommand implements ICommand<Translation> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: Translation;

  constructor(
    public readonly keyId: string,
    public readonly language: string,
    public readonly value: string,
    public readonly userId: string
  ) {}
}
