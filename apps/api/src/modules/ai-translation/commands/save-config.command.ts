import type { ICommand } from '../../../shared/cqrs/index.js';
import type { AIConfigInput, AIConfigResponse } from '../repositories/ai-translation.repository.js';

/**
 * Command to save (create or update) an AI provider configuration.
 */
export class SaveConfigCommand implements ICommand<AIConfigResponse> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: AIConfigResponse;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: AIConfigInput
  ) {}
}
