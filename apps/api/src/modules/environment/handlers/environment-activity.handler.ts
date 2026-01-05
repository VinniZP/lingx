/**
 * Environment Activity Event Handlers
 *
 * Handles activity logging for environment events.
 * These are side effects triggered by domain events.
 */

import type { ActivityService } from '../../../services/activity.service.js';
import type { IEventHandler } from '../../../shared/cqrs/index.js';
import { BranchSwitchedEvent } from '../events/branch-switched.event.js';
import { EnvironmentCreatedEvent } from '../events/environment-created.event.js';
import { EnvironmentDeletedEvent } from '../events/environment-deleted.event.js';
import { EnvironmentUpdatedEvent } from '../events/environment-updated.event.js';

/**
 * Logs activity when an environment is created.
 */
export class EnvironmentCreatedActivityHandler implements IEventHandler<EnvironmentCreatedEvent> {
  constructor(private readonly activityService: ActivityService) {}

  async handle(event: EnvironmentCreatedEvent): Promise<void> {
    await this.activityService.log({
      type: 'environment_create',
      projectId: event.environment.projectId,
      branchId: event.environment.branchId,
      userId: event.userId,
      metadata: {
        environmentName: event.environment.name,
        environmentId: event.environment.id,
      },
      changes: [
        {
          entityType: 'environment',
          entityId: event.environment.id,
          newValue: event.environment.name,
        },
      ],
    });
  }
}

/**
 * Logs activity when an environment's branch is switched.
 */
export class BranchSwitchedActivityHandler implements IEventHandler<BranchSwitchedEvent> {
  constructor(private readonly activityService: ActivityService) {}

  async handle(event: BranchSwitchedEvent): Promise<void> {
    await this.activityService.log({
      type: 'environment_switch_branch',
      projectId: event.environment.projectId,
      branchId: event.environment.branchId,
      userId: event.userId,
      metadata: {
        environmentName: event.environment.name,
        environmentId: event.environment.id,
        oldBranchName: event.previousBranchName,
        newBranchName: event.environment.branch?.name,
      },
      changes: [
        {
          entityType: 'environment',
          entityId: event.environment.id,
          oldValue: event.previousBranchName,
          newValue: event.environment.branch?.name,
        },
      ],
    });
  }
}

/**
 * Logs activity when an environment is deleted.
 */
export class EnvironmentDeletedActivityHandler implements IEventHandler<EnvironmentDeletedEvent> {
  constructor(private readonly activityService: ActivityService) {}

  async handle(event: EnvironmentDeletedEvent): Promise<void> {
    await this.activityService.log({
      type: 'environment_delete',
      projectId: event.projectId,
      userId: event.userId,
      metadata: {
        environmentName: event.environmentName,
        environmentId: event.environmentId,
      },
      changes: [
        {
          entityType: 'environment',
          entityId: event.environmentId,
          oldValue: event.environmentName,
        },
      ],
    });
  }
}

/**
 * Logs activity when an environment is updated.
 */
export class EnvironmentUpdatedActivityHandler implements IEventHandler<EnvironmentUpdatedEvent> {
  constructor(private readonly activityService: ActivityService) {}

  async handle(event: EnvironmentUpdatedEvent): Promise<void> {
    await this.activityService.log({
      type: 'environment_update',
      projectId: event.environment.projectId,
      branchId: event.environment.branchId,
      userId: event.userId,
      metadata: {
        environmentName: event.environment.name,
        environmentId: event.environment.id,
        previousName: event.previousName,
      },
      changes: [
        {
          entityType: 'environment',
          entityId: event.environment.id,
          oldValue: event.previousName,
          newValue: event.environment.name,
        },
      ],
    });
  }
}
