import type { ICommand } from '../../../shared/cqrs/index.js';
import type { ChangeEmailInput } from '../types.js';

/**
 * Command to initiate an email change.
 *
 * Sends verification email to the new address.
 */
export class InitiateEmailChangeCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** User ID requesting the change */
    public readonly userId: string,
    /** Email change input with new email and password */
    public readonly input: ChangeEmailInput
  ) {}
}
