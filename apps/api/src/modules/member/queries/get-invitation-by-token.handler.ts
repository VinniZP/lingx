import { BadRequestError, NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { InvitationRepository } from '../repositories/invitation.repository.js';
import type { GetInvitationByTokenQuery } from './get-invitation-by-token.query.js';

/**
 * Handler for GetInvitationByTokenQuery.
 * Returns public invitation details for the accept page.
 * This is a public endpoint (no authentication required).
 */
export class GetInvitationByTokenHandler implements IQueryHandler<GetInvitationByTokenQuery> {
  constructor(private readonly invitationRepository: InvitationRepository) {}

  async execute(
    query: GetInvitationByTokenQuery
  ): Promise<InferQueryResult<GetInvitationByTokenQuery>> {
    const invitation = await this.invitationRepository.findByToken(query.token);

    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    // Check if invitation is still valid
    if (invitation.acceptedAt) {
      throw new BadRequestError('This invitation has already been accepted');
    }

    if (invitation.revokedAt) {
      throw new BadRequestError('This invitation has been revoked');
    }

    const now = new Date();
    if (invitation.expiresAt < now) {
      throw new BadRequestError('This invitation has expired');
    }

    // Return public details for the accept page
    return {
      projectName: invitation.project.name,
      projectSlug: invitation.project.slug,
      role: invitation.role,
      inviterName: invitation.invitedBy.name,
      email: invitation.email,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }
}
