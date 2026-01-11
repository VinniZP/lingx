import type { ICommand } from '../../../shared/cqrs/index.js';
import type { GlossaryTag } from '../repositories/glossary.repository.js';

/**
 * Command to create a new glossary tag.
 * Requires MANAGER or OWNER role.
 */
export class CreateTagCommand implements ICommand<GlossaryTag> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: GlossaryTag;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly color?: string
  ) {}
}
