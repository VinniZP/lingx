import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to delete a project.
 */
export class DeleteProjectCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Project ID or slug */
    public readonly projectIdOrSlug: string,
    /** ID of the user deleting the project */
    public readonly userId: string
  ) {}
}
