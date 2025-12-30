/**
 * Test Fixtures
 *
 * Re-exports test helper functions and provides additional fixture utilities.
 */

// Re-export core fixtures from test-app
export {
  createTestUser,
  createTestProject,
  resetDatabase,
  getTestPrisma,
} from '../helpers/test-app.js';

// Re-export types
export type { TestUser, AuthResult } from '../helpers/test-app.js';

import { getTestPrisma } from '../helpers/test-app.js';

// =============================================================================
// Additional Fixture Types
// =============================================================================

export interface TestSpace {
  id: string;
  name: string;
  slug: string;
  projectId: string;
}

export interface TestBranch {
  id: string;
  name: string;
  slug: string;
  spaceId: string;
  isDefault: boolean;
}

export interface TestTranslationKey {
  id: string;
  name: string;
  branchId: string;
  translations: Record<string, string>;
}

export interface TestApiKey {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  userId: string;
}

// =============================================================================
// Space Fixtures
// =============================================================================

/**
 * Creates a test space with a default branch.
 */
export async function createTestSpace(
  projectId: string,
  data: { name?: string; slug?: string } = {}
): Promise<TestSpace & { defaultBranchId: string }> {
  const prisma = getTestPrisma();
  const name = data.name || 'Test Space';
  const slug = data.slug || 'test-space';

  const space = await prisma.space.create({
    data: {
      name,
      slug,
      projectId,
      branches: {
        create: {
          name: 'main',
          slug: 'main',
          isDefault: true,
        },
      },
    },
    include: {
      branches: true,
    },
  });

  return {
    id: space.id,
    name: space.name,
    slug: space.slug,
    projectId: space.projectId,
    defaultBranchId: space.branches[0].id,
  };
}

// =============================================================================
// Branch Fixtures
// =============================================================================

/**
 * Creates a test branch in a space.
 */
export async function createTestBranch(
  spaceId: string,
  data: { name?: string; slug?: string; isDefault?: boolean } = {}
): Promise<TestBranch> {
  const prisma = getTestPrisma();
  const name = data.name || 'feature-branch';
  const slug = data.slug || 'feature-branch';

  const branch = await prisma.branch.create({
    data: {
      name,
      slug,
      spaceId,
      isDefault: data.isDefault ?? false,
    },
  });

  return {
    id: branch.id,
    name: branch.name,
    slug: branch.slug,
    spaceId: branch.spaceId,
    isDefault: branch.isDefault,
  };
}

// =============================================================================
// Translation Fixtures
// =============================================================================

/**
 * Creates a translation key with translations.
 */
export async function createTestTranslationKey(
  branchId: string,
  data: {
    name?: string;
    description?: string;
    translations?: Record<string, string>;
  } = {}
): Promise<TestTranslationKey> {
  const prisma = getTestPrisma();
  const name = data.name || 'test.key';
  const translations = data.translations || { en: 'Test value' };

  const key = await prisma.translationKey.create({
    data: {
      name,
      description: data.description,
      branchId,
      translations: {
        create: Object.entries(translations).map(([lang, value]) => ({
          language: lang,
          value,
        })),
      },
    },
    include: {
      translations: true,
    },
  });

  const translationMap: Record<string, string> = {};
  for (const t of key.translations) {
    translationMap[t.language] = t.value;
  }

  return {
    id: key.id,
    name: key.name,
    branchId: key.branchId,
    translations: translationMap,
  };
}

/**
 * Seeds a branch with multiple translation keys.
 */
export async function seedBranchWithTranslations(
  branchId: string,
  count: number = 10,
  languages: string[] = ['en']
): Promise<TestTranslationKey[]> {
  const keys: TestTranslationKey[] = [];

  for (let i = 0; i < count; i++) {
    const translations: Record<string, string> = {};
    for (const lang of languages) {
      translations[lang] = `Translation ${i} in ${lang}`;
    }

    const key = await createTestTranslationKey(branchId, {
      name: `key.${i}`,
      translations,
    });
    keys.push(key);
  }

  return keys;
}

// =============================================================================
// API Key Fixtures
// =============================================================================

/**
 * Creates a test API key.
 */
export async function createTestApiKey(
  userId: string,
  data: { name?: string } = {}
): Promise<TestApiKey> {
  const prisma = getTestPrisma();
  const name = data.name || 'Test API Key';

  // Generate a test API key
  const crypto = await import('crypto');
  const keyBytes = crypto.randomBytes(32);
  const key = `lf_${keyBytes.toString('hex')}`;
  const keyPrefix = key.substring(0, 10);

  // Hash the key for storage
  const bcrypt = await import('bcrypt');
  const hashedKey = await bcrypt.hash(key, 10);

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      keyPrefix,
      keyHash: hashedKey,
      userId,
    },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    key, // Return the unhashed key for test use
    keyPrefix: apiKey.keyPrefix,
    userId: apiKey.userId,
  };
}

// =============================================================================
// Complete Test Setup
// =============================================================================

export interface FullTestSetup {
  user: import('../helpers/test-app.js').TestUser;
  project: { id: string; name: string; slug: string };
  space: TestSpace & { defaultBranchId: string };
  apiKey: TestApiKey;
}

/**
 * Creates a complete test environment with user, project, space, and API key.
 */
export async function createFullTestSetup(
  options: {
    userEmail?: string;
    projectName?: string;
    spaceName?: string;
  } = {}
): Promise<FullTestSetup> {
  const { createTestUser, createTestProject } = await import(
    '../helpers/test-app.js'
  );

  const user = await createTestUser({
    email: options.userEmail || 'test@example.com',
  });

  const project = await createTestProject(user.id, {
    name: options.projectName || 'Test Project',
    slug: options.projectName?.toLowerCase().replace(/\s+/g, '-') || 'test-project',
  });

  const space = await createTestSpace(project.id, {
    name: options.spaceName || 'Test Space',
    slug: options.spaceName?.toLowerCase().replace(/\s+/g, '-') || 'test-space',
  });

  const apiKey = await createTestApiKey(user.id);

  return {
    user,
    project,
    space,
    apiKey,
  };
}
