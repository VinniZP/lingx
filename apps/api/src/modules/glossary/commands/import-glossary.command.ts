import type { ICommand } from '../../../shared/cqrs/index.js';
import type { ImportResult } from '../repositories/glossary.repository.js';

/**
 * Command to import glossary entries from CSV or TBX.
 * Requires MANAGER or OWNER role.
 */
export class ImportGlossaryCommand implements ICommand<ImportResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: ImportResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly format: 'csv' | 'tbx',
    public readonly content: string,
    public readonly overwrite: boolean
  ) {}
}
