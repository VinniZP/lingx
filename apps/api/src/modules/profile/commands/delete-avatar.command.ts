import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to delete a user's avatar.
 *
 * Result type is void since this is a delete operation.
 */
export class DeleteAvatarCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** User ID to delete avatar for */
    public readonly userId: string
  ) {}
}
