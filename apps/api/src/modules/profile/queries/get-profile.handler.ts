import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import { toUserProfile } from '../mappers/profile.mapper.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import type { GetProfileQuery } from './get-profile.query.js';

/**
 * Handler for GetProfileQuery.
 * Retrieves a user's profile with preferences and pending email change.
 */
export class GetProfileHandler implements IQueryHandler<GetProfileQuery> {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async execute(query: GetProfileQuery): Promise<InferQueryResult<GetProfileQuery>> {
    const { userId } = query;

    const user = await this.profileRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return toUserProfile(user);
  }
}
