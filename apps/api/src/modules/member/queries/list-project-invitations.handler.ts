import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { InvitationRepository } from '../repositories/invitation.repository.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { ListProjectInvitationsQuery } from './list-project-invitations.query.js';

/**
 * Handler for ListProjectInvitationsQuery.
 * Returns pending invitations for a project if the requester has MANAGER+ role.
 */
export class ListProjectInvitationsHandler implements IQueryHandler<ListProjectInvitationsQuery> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly invitationRepository: InvitationRepository
  ) {}

  async execute(
    query: ListProjectInvitationsQuery
  ): Promise<InferQueryResult<ListProjectInvitationsQuery>> {
    // Verify requester is a member of the project
    const membership = await this.memberRepository.findMemberByUserId(
      query.projectId,
      query.requesterId
    );
    if (!membership) {
      throw new ForbiddenError('You are not a member of this project');
    }

    // Only MANAGER and OWNER can view pending invitations
    if (membership.role === 'DEVELOPER') {
      throw new ForbiddenError('Only MANAGER or OWNER can view pending invitations');
    }

    // Return pending invitations
    return this.invitationRepository.findPendingByProject(query.projectId);
  }
}
