import type { MTProviderType } from '../../../services/providers/index.js';
import type { ICommand } from '../../../shared/cqrs/index.js';

export interface DeleteConfigResult {
  success: boolean;
}

/**
 * Command to delete an MT provider configuration.
 */
export class DeleteConfigCommand implements ICommand<DeleteConfigResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: DeleteConfigResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly provider: MTProviderType
  ) {}
}
