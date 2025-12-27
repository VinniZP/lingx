// Localeflow API Test Fixtures - Design Doc: DESIGN.md
// Generated: 2025-12-27
// Purpose: Shared test data and setup utilities for integration tests

/**
 * Test Fixture Types
 *
 * These types define the structure of test fixtures used across integration tests.
 * Implementation should create actual fixture data matching these structures.
 */

// =============================================================================
// User Fixtures
// =============================================================================

export interface TestUserFixture {
  id: string;
  email: string;
  password: string; // Plaintext for test login
  name: string;
  role: 'developer' | 'manager' | 'admin';
}

/**
 * TODO: Implement createTestUser function
 *
 * Creates a user in the test database with specified role.
 *
 * @param overrides - Partial user data to override defaults
 * @returns Created user with test password (plaintext)
 */
// export async function createTestUser(overrides?: Partial<TestUserFixture>): Promise<TestUserFixture>

// =============================================================================
// Project Fixtures
// =============================================================================

export interface TestProjectFixture {
  id: string;
  name: string;
  slug: string;
  languages: Array<{
    code: string;
    name: string;
    nativeName: string;
    isDefault: boolean;
  }>;
}

/**
 * TODO: Implement createTestProject function
 *
 * Creates a project with specified languages.
 *
 * @param userId - Owner user ID
 * @param overrides - Partial project data to override defaults
 * @returns Created project
 */
// export async function createTestProject(userId: string, overrides?: Partial<TestProjectFixture>): Promise<TestProjectFixture>

// =============================================================================
// Space Fixtures
// =============================================================================

export interface TestSpaceFixture {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  mainBranchId: string;
}

/**
 * TODO: Implement createTestSpace function
 *
 * Creates a space with auto-generated main branch.
 *
 * @param projectId - Parent project ID
 * @param overrides - Partial space data to override defaults
 * @returns Created space with main branch reference
 */
// export async function createTestSpace(projectId: string, overrides?: Partial<Omit<TestSpaceFixture, 'mainBranchId'>>): Promise<TestSpaceFixture>

// =============================================================================
// Branch Fixtures
// =============================================================================

export interface TestBranchFixture {
  id: string;
  spaceId: string;
  name: string;
  baseBranchId: string | null;
  isDefault: boolean;
}

/**
 * TODO: Implement createTestBranch function
 *
 * Creates a branch from specified source branch.
 *
 * @param spaceId - Parent space ID
 * @param fromBranchId - Source branch to copy from
 * @param name - New branch name
 * @returns Created branch
 */
// export async function createTestBranch(spaceId: string, fromBranchId: string, name: string): Promise<TestBranchFixture>

// =============================================================================
// Translation Fixtures
// =============================================================================

export interface TestTranslationKeyFixture {
  id: string;
  branchId: string;
  key: string;
  description: string | null;
  translations: Record<string, string>; // languageCode -> value
}

/**
 * TODO: Implement createTestTranslationKey function
 *
 * Creates a translation key with values for specified languages.
 *
 * @param branchId - Parent branch ID
 * @param key - Translation key name
 * @param translations - Map of language code to translation value
 * @param description - Optional key description
 * @returns Created translation key with translations
 */
// export async function createTestTranslationKey(
//   branchId: string,
//   key: string,
//   translations: Record<string, string>,
//   description?: string
// ): Promise<TestTranslationKeyFixture>

/**
 * TODO: Implement seedBranchWithTranslations function
 *
 * Seeds a branch with multiple translation keys for testing.
 *
 * @param branchId - Branch to seed
 * @param count - Number of keys to create
 * @param languages - Language codes to create translations for
 * @returns Array of created translation keys
 */
// export async function seedBranchWithTranslations(
//   branchId: string,
//   count: number,
//   languages: string[]
// ): Promise<TestTranslationKeyFixture[]>

// =============================================================================
// API Key Fixtures
// =============================================================================

export interface TestApiKeyFixture {
  id: string;
  userId: string;
  name: string;
  key: string; // Full key (normally only available at creation)
  keyPrefix: string;
}

/**
 * TODO: Implement createTestApiKey function
 *
 * Creates an API key for testing CLI/SDK authentication.
 *
 * @param userId - User to create key for
 * @param name - Key name
 * @returns Created API key with full key (for testing)
 */
// export async function createTestApiKey(userId: string, name: string): Promise<TestApiKeyFixture>

// =============================================================================
// Complete Setup Fixtures
// =============================================================================

export interface FullTestSetupFixture {
  user: TestUserFixture;
  apiKey: TestApiKeyFixture;
  project: TestProjectFixture;
  space: TestSpaceFixture;
  mainBranch: TestBranchFixture;
  translations: TestTranslationKeyFixture[];
}

/**
 * TODO: Implement createFullTestSetup function
 *
 * Creates a complete test environment with user, project, space, branch, and translations.
 * Useful for tests that need a fully populated system.
 *
 * @param options - Configuration options
 * @returns Complete test setup
 */
// export async function createFullTestSetup(options?: {
//   translationCount?: number;
//   languages?: string[];
// }): Promise<FullTestSetupFixture>

// =============================================================================
// Cleanup Utilities
// =============================================================================

/**
 * TODO: Implement cleanupTestData function
 *
 * Removes all test data created during tests.
 * Should be called in afterEach or afterAll hooks.
 */
// export async function cleanupTestData(): Promise<void>

/**
 * TODO: Implement resetDatabase function
 *
 * Resets database to a known clean state.
 * Useful between tests for isolation.
 */
// export async function resetDatabase(): Promise<void>
