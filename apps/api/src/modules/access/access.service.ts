/**
 * Access Service
 *
 * Handles authorization and access control for resources.
 * Verifies user membership and permissions for translations, branches, and projects.
 * Uses AccessRepository for data access.
 */

import type { ProjectRole } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../plugins/error-handler.js';
import type { AccessRepository } from './access.repository.js';

export interface ProjectInfo {
  projectId: string;
  defaultLanguage: string;
  languages: string[];
}

export interface KeyInfo {
  id: string;
  name: string;
  namespace: string | null;
}

export class AccessService {
  constructor(private readonly accessRepository: AccessRepository) {}

  /**
   * Verify user has access to a translation via project membership.
   * @throws NotFoundError if translation doesn't exist
   * @throws ForbiddenError if user has no access
   */
  async verifyTranslationAccess(userId: string, translationId: string): Promise<void> {
    const translation = await this.accessRepository.findTranslationWithMembership(
      translationId,
      userId
    );

    if (!translation) {
      throw new NotFoundError('Translation');
    }

    if (translation.key.branch.space.project.members.length === 0) {
      throw new ForbiddenError('Not authorized to access this translation');
    }
  }

  /**
   * Verify user has access to a translation key via project membership.
   * @throws NotFoundError if key doesn't exist
   * @throws ForbiddenError if user has no access
   */
  async verifyKeyAccess(userId: string, keyId: string): Promise<void> {
    const key = await this.accessRepository.findKeyWithMembership(keyId, userId);

    if (!key) {
      throw new NotFoundError('Key');
    }

    if (key.branch.space.project.members.length === 0) {
      throw new ForbiddenError('Not authorized to access this key');
    }
  }

  /**
   * Verify user has access to a key AND that the key belongs to the specified branch.
   * @returns Key info (id, name, namespace)
   * @throws NotFoundError if key doesn't exist or doesn't belong to the branch
   * @throws ForbiddenError if user has no access
   */
  async verifyKeyInBranch(userId: string, keyId: string, branchId: string): Promise<KeyInfo> {
    const key = await this.accessRepository.findKeyInBranchWithMembership(keyId, branchId, userId);

    if (!key || key.branchId !== branchId) {
      throw new NotFoundError('Key');
    }

    if (key.branch.space.project.members.length === 0) {
      throw new ForbiddenError('Not authorized to access this key');
    }

    return {
      id: key.id,
      name: key.name,
      namespace: key.namespace,
    };
  }

  /**
   * Verify user has access to a branch and return project info.
   * @throws NotFoundError if branch doesn't exist
   * @throws ForbiddenError if user has no access
   */
  async verifyBranchAccess(userId: string, branchId: string): Promise<ProjectInfo> {
    const branch = await this.accessRepository.findBranchWithMembership(branchId, userId);

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    const project = branch.space.project;
    if (project.members.length === 0) {
      throw new ForbiddenError('Not authorized to access this branch');
    }

    return {
      projectId: project.id,
      defaultLanguage: project.defaultLanguage,
      languages: project.languages.map((l) => l.code),
    };
  }

  /**
   * Verify user has access to a project with optional role check.
   * @throws ForbiddenError if user has no access or insufficient role
   */
  async verifyProjectAccess(
    userId: string,
    projectId: string,
    requiredRoles?: ProjectRole[]
  ): Promise<{ role: ProjectRole }> {
    const membership = await this.accessRepository.findProjectMembership(projectId, userId);

    if (!membership) {
      throw new ForbiddenError('Not authorized to access this project');
    }

    if (requiredRoles && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenError('Insufficient permissions for this operation');
    }

    return { role: membership.role };
  }
}
