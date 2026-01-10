import type { Translation } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to set approval status for a single translation.
 * Only MANAGER or OWNER roles can approve/reject.
 */
export class SetApprovalStatusCommand implements ICommand<Translation> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: Translation;

  constructor(
    public readonly translationId: string,
    public readonly status: 'APPROVED' | 'REJECTED',
    public readonly userId: string
  ) {}
}
