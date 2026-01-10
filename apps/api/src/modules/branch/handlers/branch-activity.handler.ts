/**
 * Branch Activity Event Handlers
 *
 * Handles activity logging for branch events.
 * These are side effects triggered by domain events.
 *
 * NOTE: Activity logging failures are caught and logged but do not propagate.
 * This ensures primary operations succeed even if activity logging fails.
 */

import type { FastifyBaseLogger } from 'fastify';
import type { ActivityService } from '../../../services/activity.service.js';
import type { IEventHandler } from '../../../shared/cqrs/index.js';
import { BranchCreatedEvent } from '../events/branch-created.event.js';
import { BranchDeletedEvent } from '../events/branch-deleted.event.js';
import { BranchesMergedEvent } from '../events/branches-merged.event.js';

/**
 * Logs activity when a branch is created.
 */
export class BranchCreatedActivityHandler implements IEventHandler<BranchCreatedEvent> {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: BranchCreatedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'branch_create',
        projectId: event.branch.space.projectId,
        branchId: event.branch.id,
        userId: event.userId,
        metadata: {
          branchName: event.branch.name,
          branchId: event.branch.id,
          sourceBranchName: event.sourceBranchName,
          sourceBranchId: event.sourceBranchId,
        },
        changes: [
          {
            entityType: 'branch',
            entityId: event.branch.id,
            newValue: event.branch.name,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'BranchCreatedEvent', branchId: event.branch.id },
        'Failed to log branch creation activity'
      );
    }
  }
}

/**
 * Logs activity when a branch is deleted.
 */
export class BranchDeletedActivityHandler implements IEventHandler<BranchDeletedEvent> {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: BranchDeletedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'branch_delete',
        projectId: event.projectId,
        userId: event.userId,
        metadata: {
          branchName: event.branchName,
          branchId: event.branchId,
        },
        changes: [
          {
            entityType: 'branch',
            entityId: event.branchId,
            oldValue: event.branchName,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'BranchDeletedEvent', branchId: event.branchId },
        'Failed to log branch deletion activity'
      );
    }
  }
}

/**
 * Logs activity when branches are merged.
 */
export class BranchesMergedActivityHandler implements IEventHandler<BranchesMergedEvent> {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: BranchesMergedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'merge',
        projectId: event.projectId,
        branchId: event.targetBranchId,
        userId: event.userId,
        metadata: {
          sourceBranchName: event.sourceBranchName,
          sourceBranchId: event.sourceBranchId,
          targetBranchName: event.targetBranchName,
          targetBranchId: event.targetBranchId,
          conflictsResolved: event.conflictsResolved,
        },
        changes: [
          {
            entityType: 'merge',
            entityId: `${event.sourceBranchId}->${event.targetBranchId}`,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        {
          error,
          eventName: 'BranchesMergedEvent',
          sourceBranchId: event.sourceBranchId,
          targetBranchId: event.targetBranchId,
        },
        'Failed to log branch merge activity'
      );
    }
  }
}
