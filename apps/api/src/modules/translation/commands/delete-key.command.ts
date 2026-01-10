import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to delete a translation key.
 */
export class DeleteKeyCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    public readonly keyId: string,
    public readonly userId: string
  ) {}
}
