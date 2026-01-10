import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { GetKeyQuery } from './get-key.query.js';

/**
 * Handler for GetKeyQuery.
 * Gets a single translation key with its translations.
 *
 * Authorization: Requires project membership via key access.
 */
export class GetKeyHandler implements IQueryHandler<GetKeyQuery> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetKeyQuery): Promise<InferQueryResult<GetKeyQuery>> {
    const { keyId, userId } = query;

    // Verify user has access to the key
    await this.accessService.verifyKeyAccess(userId, keyId);

    // Fetch key from repository
    const key = await this.translationRepository.findKeyById(keyId);

    if (!key) {
      throw new NotFoundError('Key');
    }

    return key;
  }
}
