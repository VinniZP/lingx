import type { ICommand } from '../../../shared/cqrs/index.js';

export interface DeleteTagResult {
  success: boolean;
}

/**
 * Command to delete a glossary tag.
 * Requires MANAGER or OWNER role.
 */
export class DeleteTagCommand implements ICommand<DeleteTagResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: DeleteTagResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly tagId: string
  ) {}
}
