/**
 * Access Module
 *
 * Provides authorization and access control for resources.
 * No CQRS handlers - this module provides services for use by other handlers.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';

// Repository and Service
import { AccessRepository } from './access.repository.js';
import { AccessService } from './access.service.js';

// Re-export types
export type {
  BranchWithMembership,
  KeyInBranchWithMembership,
  KeyWithMembership,
  ProjectMembershipResult,
  TranslationWithMembership,
} from './access.repository.js';
export { AccessService, type KeyInfo, type ProjectInfo } from './access.service.js';

/**
 * Register access module with the container.
 */
export function registerAccessModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    accessRepository: asClass(AccessRepository).singleton(),
  });

  // Register service
  container.register({
    accessService: asClass(AccessService).singleton(),
  });
}
