import type { ICommand } from '../../../shared/cqrs/index.js';
import type { AIProviderType } from '../services/ai-provider.service.js';

export interface TestConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * Command to test an AI provider connection.
 */
export class TestConnectionCommand implements ICommand<TestConnectionResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: TestConnectionResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly provider: AIProviderType
  ) {}
}
