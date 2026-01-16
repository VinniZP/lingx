/**
 * Admin Audit Handler
 *
 * Event handler for admin action audit logging.
 * Handles UserDisabledEvent, UserEnabledEvent, and UserImpersonatedEvent
 * to create audit log entries with before/after state capture.
 */

import type { FastifyBaseLogger } from 'fastify';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';
import type { UserDisabledEvent } from '../events/user-disabled.event.js';
import type { UserEnabledEvent } from '../events/user-enabled.event.js';
import type { UserImpersonatedEvent } from '../events/user-impersonated.event.js';
import type { AuditLogRepository } from '../repositories/audit-log.repository.js';

type AdminAuditEvent = UserDisabledEvent | UserEnabledEvent | UserImpersonatedEvent;

/**
 * Event handler for admin audit logging.
 *
 * Creates audit log entries for all admin actions:
 * - USER_DISABLED: When an admin disables a user
 * - USER_ENABLED: When an admin enables a user
 * - USER_IMPERSONATED: When an admin impersonates a user
 *
 * Error handling: Logs errors but doesn't propagate them to avoid
 * blocking admin operations if audit logging fails.
 */
export class AdminAuditHandler implements IEventHandler<AdminAuditEvent> {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: IEvent): Promise<void> {
    try {
      if (this.isUserDisabledEvent(event)) {
        await this.handleUserDisabled(event);
      } else if (this.isUserEnabledEvent(event)) {
        await this.handleUserEnabled(event);
      } else if (this.isUserImpersonatedEvent(event)) {
        await this.handleUserImpersonated(event);
      }
    } catch (error) {
      // Log but don't propagate - audit failure shouldn't block operations
      this.logger.error(
        { error, eventType: event.constructor.name },
        'Failed to create audit log entry'
      );
    }
  }

  private async handleUserDisabled(event: UserDisabledEvent): Promise<void> {
    await this.auditLogRepository.create({
      adminId: event.actorId,
      action: 'USER_DISABLED',
      targetType: 'USER',
      targetId: event.userId,
      beforeState: event.beforeState,
      afterState: event.afterState,
      metadata: { anonymized: event.anonymized },
      ipAddress: event.requestContext.ipAddress,
      userAgent: event.requestContext.userAgent,
    });

    this.logger.info(
      {
        action: 'USER_DISABLED',
        adminId: event.actorId,
        targetId: event.userId,
        anonymized: event.anonymized,
      },
      'Admin audit: User disabled'
    );
  }

  private async handleUserEnabled(event: UserEnabledEvent): Promise<void> {
    await this.auditLogRepository.create({
      adminId: event.actorId,
      action: 'USER_ENABLED',
      targetType: 'USER',
      targetId: event.userId,
      beforeState: event.beforeState,
      afterState: event.afterState,
      ipAddress: event.requestContext.ipAddress,
      userAgent: event.requestContext.userAgent,
    });

    this.logger.info(
      {
        action: 'USER_ENABLED',
        adminId: event.actorId,
        targetId: event.userId,
      },
      'Admin audit: User enabled'
    );
  }

  private async handleUserImpersonated(event: UserImpersonatedEvent): Promise<void> {
    await this.auditLogRepository.create({
      adminId: event.actorId,
      action: 'USER_IMPERSONATED',
      targetType: 'USER',
      targetId: event.targetUserId,
      beforeState: event.targetUserState,
      metadata: { tokenExpiry: event.tokenExpiry.toISOString() },
      ipAddress: event.requestContext.ipAddress,
      userAgent: event.requestContext.userAgent,
    });

    this.logger.info(
      {
        action: 'USER_IMPERSONATED',
        adminId: event.actorId,
        targetId: event.targetUserId,
        tokenExpiry: event.tokenExpiry.toISOString(),
      },
      'Admin audit: User impersonated'
    );
  }

  // Type guards for event identification
  private isUserDisabledEvent(event: IEvent): event is UserDisabledEvent {
    return event.constructor.name === 'UserDisabledEvent';
  }

  private isUserEnabledEvent(event: IEvent): event is UserEnabledEvent {
    return event.constructor.name === 'UserEnabledEvent';
  }

  private isUserImpersonatedEvent(event: IEvent): event is UserImpersonatedEvent {
    return event.constructor.name === 'UserImpersonatedEvent';
  }
}
