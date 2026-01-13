import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { TestConnectionCommand } from './test-connection.command.js';

/**
 * Handler for TestConnectionCommand.
 * Tests MT provider connection by performing a sample translation.
 */
export class TestConnectionHandler implements ICommandHandler<TestConnectionCommand> {
  constructor(
    private readonly machineTranslationRepository: MachineTranslationRepository,
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
      const mtProvider = await this.machineTranslationRepository.getInitializedProvider(
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
