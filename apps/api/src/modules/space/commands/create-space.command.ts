import type { Space } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to create a new space in a project.
 */
export class CreateSpaceCommand implements ICommand<Space> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: Space;

  constructor(
    /** Project ID (internal ID) */
    public readonly projectId: string,
    /** Space name */
    public readonly name: string,
    /** Space slug (URL-friendly identifier, unique within project) */
    public readonly slug: string,
    /** Optional space description */
    public readonly description: string | undefined,
    /** ID of the user creating the space */
    public readonly userId: string
  ) {}
}
