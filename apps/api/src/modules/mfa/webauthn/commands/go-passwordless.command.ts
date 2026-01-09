/**
 * GoPasswordlessCommand
 *
 * Removes password and goes fully passwordless.
 * Requires at least 2 passkeys for safety.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface GoPasswordlessResult {
  success: boolean;
}

export class GoPasswordlessCommand implements ICommand<GoPasswordlessResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: GoPasswordlessResult;

  constructor(public readonly userId: string) {}
}
