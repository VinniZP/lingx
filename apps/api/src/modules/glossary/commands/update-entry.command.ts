import type { UpdateGlossaryEntryInput } from '@lingx/shared';
import type { ICommand } from '../../../shared/cqrs/index.js';
import type { GlossaryEntryWithRelations } from '../repositories/glossary.repository.js';

/**
 * Command to update a glossary entry.
 */
export class UpdateEntryCommand implements ICommand<GlossaryEntryWithRelations> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: GlossaryEntryWithRelations;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly entryId: string,
    public readonly input: UpdateGlossaryEntryInput
  ) {}
}
