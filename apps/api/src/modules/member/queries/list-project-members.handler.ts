import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { ListProjectMembersQuery } from './list-project-members.query.js';

/**
 * Handler for ListProjectMembersQuery.
 * Returns all members of a project if the requester is a member.
 */
export class ListProjectMembersHandler implements IQueryHandler<ListProjectMembersQuery> {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(
    query: ListProjectMembersQuery
  ): Promise<InferQueryResult<ListProjectMembersQuery>> {
    // Verify requester is a member of the project
    const membership = await this.memberRepository.findMemberByUserId(
      query.projectId,
      query.requesterId
    );
    if (!membership) {
      throw new ForbiddenError('You are not a member of this project');
    }

    // Return all members (any role can view the member list)
    return this.memberRepository.findProjectMembers(query.projectId);
  }
}
