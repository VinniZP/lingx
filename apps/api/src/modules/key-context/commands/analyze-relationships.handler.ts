import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { RelationshipsAnalyzedEvent } from '../events/relationships-analyzed.event.js';
import type { KeyContextService } from '../key-context.service.js';
import type { AnalyzeRelationshipsCommand } from './analyze-relationships.command.js';

/**
 * Handler for AnalyzeRelationshipsCommand.
 * Triggers relationship analysis for a branch and emits event.
 */
export class AnalyzeRelationshipsHandler implements ICommandHandler<AnalyzeRelationshipsCommand> {
  constructor(
    private readonly keyContextService: KeyContextService,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: AnalyzeRelationshipsCommand
  ): Promise<InferCommandResult<AnalyzeRelationshipsCommand>> {
    const { branchId, types, minSimilarity, userId } = command;

    // Verify user has access to the branch and get project info
    const { defaultLanguage } = await this.accessService.verifyBranchAccess(userId, branchId);

    // Run analysis if SEMANTIC type is requested
    if (types.includes('SEMANTIC')) {
      const sourceLanguage = defaultLanguage ?? 'en';

      await this.keyContextService.computeSemanticRelationships(
        branchId,
        sourceLanguage,
        minSimilarity
      );
    }

    // Generate a simple job ID
    const jobId = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await this.eventBus.publish(new RelationshipsAnalyzedEvent(branchId, jobId, types, userId));

    return {
      jobId,
      status: 'completed' as const,
    };
  }
}
