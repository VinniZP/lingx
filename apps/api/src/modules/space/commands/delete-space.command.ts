import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to delete a space.
 */
export class DeleteSpaceCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Space ID */
    public readonly spaceId: string,
    /** ID of the user performing the deletion */
    public readonly userId: string
  ) {}
}
