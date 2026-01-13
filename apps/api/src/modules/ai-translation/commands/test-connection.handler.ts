import { generateText } from 'ai';
import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';
import type { AIProviderService } from '../services/ai-provider.service.js';
import type { TestConnectionCommand } from './test-connection.command.js';

/**
 * Handler for TestConnectionCommand.
 * Tests an AI provider connection by making a simple API call.
 */
export class TestConnectionHandler implements ICommandHandler<TestConnectionCommand> {
  constructor(
    private readonly aiRepository: AITranslationRepository,
    private readonly accessService: AccessService,
    private readonly aiProviderService: AIProviderService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: TestConnectionCommand
  ): Promise<InferCommandResult<TestConnectionCommand>> {
    // Verify user is MANAGER or OWNER
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    // Database errors should propagate - they're infrastructure issues, not connection issues
    const config = await this.aiRepository.getConfig(command.projectId, command.provider);

    if (!config) {
      return { success: false, error: `No configuration found for ${command.provider}` };
    }

    // Only catch API-related errors
    try {
      const model = this.aiProviderService.getLanguageModel(
        command.provider,
        config.model,
        config.apiKey
      );

      // Try a simple completion
      await generateText({
        model,
        prompt: 'Say "ok"',
        maxOutputTokens: 5,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        {
          projectId: command.projectId,
          provider: command.provider,
          model: config.model,
          error: errorMessage,
        },
        '[AI Translation] Connection test failed'
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
