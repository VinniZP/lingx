import type { ICommand } from '../../../shared/cqrs/index.js';
import type { AIContextConfigInput } from '../repositories/ai-translation.repository.js';

/**
 * Command to update AI context configuration for a project.
 */
export class UpdateContextConfigCommand implements ICommand<AIContextConfigInput> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: AIContextConfigInput;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly input: AIContextConfigInput
  ) {}
}
