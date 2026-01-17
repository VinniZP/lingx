import type { IEvent } from '../../../shared/cqrs/index.js';
import type { InvitationWithDetails } from '../repositories/invitation.repository.js';

/**
 * Event emitted when an invitation is accepted.
 *
 * Side effects can include:
 * - Recording activity log
 * - Notifying the inviter
 */
export class InvitationAcceptedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The invitation that was accepted */
    public readonly invitation: InvitationWithDetails,
    /** User ID who accepted the invitation */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
