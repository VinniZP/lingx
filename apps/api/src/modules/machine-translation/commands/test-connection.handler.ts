import type { FastifyBaseLogger } from 'fastify';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { TestConnectionCommand } from './test-connection.command.js';

/**
 * Handler for TestConnectionCommand.
 * Tests MT provider connection by performing a sample translation.
 */
export class TestConnectionHandler implements ICommandHandler<TestConnectionCommand> {
  constructor(
    private readonly mtRepository: MachineTranslationRepository,
    private readonly accessService: AccessService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: TestConnectionCommand
  ): Promise<InferCommandResult<TestConnectionCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    try {
      const mtProvider = await this.mtRepository.getInitializedProvider(
        command.projectId,
        command.provider
      );

      // Try a simple translation
      await mtProvider.translate('Hello', 'en', 'es');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        {
          projectId: command.projectId,
          provider: command.provider,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        '[MT] Connection test failed'
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
