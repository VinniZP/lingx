import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to index a single approved translation into TM.
 * Called by the TM worker when processing index-approved jobs.
 */
export class IndexApprovedTranslationCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    public readonly projectId: string,
    public readonly translationId: string
  ) {}
}
