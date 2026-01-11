/**
 * Space Module Test Utilities
 *
 * Shared mock interfaces and factory functions for space module tests.
 */

import type { Space } from '@prisma/client';
import { vi, type Mock } from 'vitest';

// Mock interfaces
export interface MockSpaceRepository {
  findById: Mock;
  findByProjectId: Mock;
  existsBySlugInProject: Mock;
  getProjectIdBySpaceId: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  exists: Mock;
}

export interface MockProjectRepository {
  findById: Mock;
  findBySlug: Mock;
  findByIdOrSlug: Mock;
  existsBySlug: Mock;
  getMemberRole: Mock;
  checkMembership: Mock;
  findByUserIdWithStats: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  getTree: Mock;
}

export interface MockEventBus {
  publish: Mock;
  publishAll: Mock;
}

export interface MockActivityService {
  log: Mock;
}

export interface MockLogger {
  error: Mock;
  warn: Mock;
  info: Mock;
  debug: Mock;
}

// Factory functions
export function createMockSpaceRepository(): MockSpaceRepository {
  return {
    findById: vi.fn(),
    findByProjectId: vi.fn(),
    existsBySlugInProject: vi.fn(),
    getProjectIdBySpaceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    exists: vi.fn(),
  };
}

export function createMockProjectRepository(): MockProjectRepository {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByIdOrSlug: vi.fn(),
    existsBySlug: vi.fn(),
    getMemberRole: vi.fn(),
    checkMembership: vi.fn(),
    findByUserIdWithStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    getTree: vi.fn(),
  };
}

export function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };
}

export function createMockActivityService(): MockActivityService {
  return {
    log: vi.fn(),
  };
}

export function createMockLogger(): MockLogger {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
}

// Test data factories
export function createMockSpace(overrides: Partial<Space> = {}): Space {
  return {
    id: 'space-1',
    name: 'Test Space',
    slug: 'test-space',
    description: 'A test space',
    projectId: 'project-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createMockProject(
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    defaultLanguage: string;
    languageCodes: string[];
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: 'project-1',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    defaultLanguage: 'en',
    languageCodes: ['en', 'es'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}
