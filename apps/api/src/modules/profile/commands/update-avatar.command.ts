import type { MultipartFile } from '@fastify/multipart';
import type { ICommand } from '../../../shared/cqrs/index.js';
import type { AvatarResult } from '../types.js';

/**
 * Command to update a user's avatar.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class UpdateAvatarCommand implements ICommand<AvatarResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: AvatarResult;

  constructor(
    /** User ID to update */
    public readonly userId: string,
    /** Uploaded file */
    public readonly file: MultipartFile
  ) {}
}
