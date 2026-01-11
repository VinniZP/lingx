import type { ICommand } from '../../../shared/cqrs/index.js';
import type {
  MTConfigInput,
  MTConfigResponse,
} from '../repositories/machine-translation.repository.js';

/**
 * Command to save (create or update) an MT provider configuration.
 */
export class SaveConfigCommand implements ICommand<MTConfigResponse> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: MTConfigResponse;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: MTConfigInput
  ) {}
}
