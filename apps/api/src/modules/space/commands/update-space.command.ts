import type { UpdateSpaceInput } from '@lingx/shared';
import type { Space } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';

// Re-export for convenience
export type { UpdateSpaceInput } from '@lingx/shared';

/**
 * Command to update a space.
 */
export class UpdateSpaceCommand implements ICommand<Space> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: Space;

  constructor(
    /** Space ID */
    public readonly spaceId: string,
    /** ID of the user performing the update */
    public readonly userId: string,
    /** Update data */
    public readonly input: UpdateSpaceInput
  ) {}

  /**
   * Check if the command has any actual changes to apply.
   */
  hasChanges(): boolean {
    return this.input.name !== undefined || this.input.description !== undefined;
  }
}
