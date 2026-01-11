import type { ICommand } from '../../../shared/cqrs/index.js';

export interface DeleteEntryResult {
  success: boolean;
}

/**
 * Command to delete a glossary entry.
 * Requires MANAGER or OWNER role.
 */
export class DeleteEntryCommand implements ICommand<DeleteEntryResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: DeleteEntryResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly entryId: string
  ) {}
}
